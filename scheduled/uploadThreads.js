const { REST, Routes } = require('discord.js');
const d1 = require('../tooling/d1');

async function fetchAllGuildMembers(rest, guildId) {
    console.log({ message: 'Starting to fetch all guild members' });
    const memberMap = {};
    try {
        let lastId = '0';
        let hasMore = true;
        let fetchedCount = 0;
        while (hasMore) {
            console.log({ message: `Fetching batch of guild members after ID ${lastId}` });
            const params = new URLSearchParams({ limit: '1000', after: lastId });
            try {
                const members = await rest.get(`${Routes.guildMembers(guildId)}?${params.toString()}`);
                const arr = Array.isArray(members) ? members : [];
                console.log({
                    message: 'Response from Discord API',
                    isArray: Array.isArray(members),
                    responseType: typeof members,
                    memberCount: arr.length,
                    firstMember: arr.length > 0 ? JSON.stringify(arr[0]).substring(0, 100) + '...' : 'none'
                });
                if (!arr.length) {
                    console.log({ message: 'No more members to fetch' });
                    hasMore = false;
                    break;
                }
                lastId = arr[arr.length - 1].user.id;
                fetchedCount += arr.length;
                for (const member of arr) {
                    if (member.user) {
                        memberMap[member.user.id] = member.nick || member.user.username;
                    }
                }
                console.log({
                    message: 'Fetched batch of guild members',
                    count: arr.length,
                    totalFetched: fetchedCount,
                    firstMemberId: arr.length > 0 ? arr[0].user?.id : 'none',
                    lastMemberId: arr.length > 0 ? arr[arr.length - 1].user?.id : 'none'
                });
                if (arr.length < 1000) hasMore = false;
            } catch (error) {
                if (error.message && error.message.includes('Missing Access')) {
                    console.warn({
                        message: 'Missing GUILD_MEMBERS privileged intent. Cannot fetch all members at once.',
                        error: error.message
                    });
                    hasMore = false;
                    break;
                } else {
                    console.error({
                        message: 'Error fetching guild members',
                        error: error.message,
                        stack: error.stack
                    });
                    hasMore = false;
                    break;
                }
            }
        }
        if (Object.keys(memberMap).length === 0) {
            console.log({
                message: 'No members could be fetched in bulk. Will fetch individual thread owners later.'
            });
        }
    } catch (error) {
        console.error({
            message: 'Fatal error in fetchAllGuildMembers',
            error: error.message,
            stack: error.stack
        });
    }
    console.log({
        message: 'Completed fetching all guild members',
        totalMembers: Object.keys(memberMap).length,
        hasMembers: Object.keys(memberMap).length > 0,
        sampleMembers: Object.keys(memberMap).slice(0, 5).map(id => ({ id, name: memberMap[id] }))
    });
    return memberMap;
}

module.exports = {
    data: {
        name: 'uploadThreads',
        description: 'Uploads threads to the database',
        cron: '0 * * * *', // Runs hourly
    },
    async executeScheduledTask(client) {
        console.log({ message: 'Starting scheduled task: Discord thread tracking' });
        const startTime = Date.now();
        const results = {
            success: true,
            threadsProcessed: 0,
            threadsInserted: 0,
            threadsUpdated: 0,
            threadsUnchanged: 0,
            threadsDeleted: 0,
            tagsInserted: 0,
            tagsUpdated: 0,
            tagsUnchanged: 0,
            errors: []
        };
        try {
            const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
            const guildId = process.env.GUILDID || process.env.GUILD_ID;
            if (!guildId) throw new Error('GUILDID or GUILD_ID environment variable is not set');
            console.log({ message: 'Processing threads for guild', guildId });
            // Fetch current DB state
            console.log({ message: 'Fetching current discord_threads from database' });
            const dbThreadsRows = await d1.d1Query('SELECT * FROM discord_threads');
            const dbThreads = {};
            for (const row of dbThreadsRows) {
                if (row.results && Array.isArray(row.results)) {
                    for (const thread of row.results) {
                        dbThreads[thread.thread_id] = thread;
                    }
                }
            }
            console.log({ message: 'Fetched threads from DB', count: Object.keys(dbThreads).length });
            console.log({ message: 'Fetching current discord_channel_tags from database' });
            const dbTagsRows = await d1.d1Query('SELECT * FROM discord_channel_tags');
            const dbTags = {};
            for (const row of dbTagsRows) {
                if (row.results && Array.isArray(row.results)) {
                    for (const tag of row.results) {
                        dbTags[`${tag.parent_id}:${tag.tag_id}`] = tag;
                    }
                }
            }
            console.log({ message: 'Fetched channel tags from DB', count: Object.keys(dbTags).length });
            // Fetch members
            console.log({ message: 'Fetching all guild members to create user mapping' });
            const memberMap = await fetchAllGuildMembers(rest, guildId);
            console.log({ message: 'Created member mapping', memberCount: Object.keys(memberMap).length });
            // Fetch threads
            console.log({ message: 'Fetching all active threads in the guild' });
            const activeThreads = await rest.get(Routes.guildActiveThreads(guildId));
            console.log({ message: 'Found active threads in guild', count: activeThreads.threads?.length || 0, guildId });
            const uniqueParentIds = new Set();
            if (activeThreads.threads && activeThreads.threads.length > 0) {
                for (const thread of activeThreads.threads) {
                    console.log({ message: 'Processing thread', threadId: thread.id, threadName: thread.name });
                    // Insert thread
                    const { id, name, topic, owner_id, parent_id, member_count, message_count, available_tags, applied_tags, thread_metadata } = thread;
                    let owner_nickname = owner_id && memberMap[owner_id] ? memberMap[owner_id] : null;
                    const threadRow = {
                        thread_id: id,
                        thread_name: name,
                        topic: topic || null,
                        owner_id,
                        owner_nickname,
                        parent_id: parent_id || null,
                        member_count,
                        message_count,
                        available_tags: available_tags ? JSON.stringify(available_tags) : null,
                        applied_tags: applied_tags ? JSON.stringify(applied_tags) : null,
                        thread_metadata: thread_metadata ? JSON.stringify(thread_metadata) : null
                    };
                    const dbThread = dbThreads[id];
                    if (!dbThread) {
                        // Insert new thread
                        await d1.d1Query(`
                            INSERT INTO discord_threads (
                                thread_id, thread_name, topic, owner_id, owner_nickname,
                                parent_id, member_count, message_count, available_tags, applied_tags, thread_metadata
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            threadRow.thread_id,
                            threadRow.thread_name,
                            threadRow.topic,
                            threadRow.owner_id,
                            threadRow.owner_nickname,
                            threadRow.parent_id,
                            threadRow.member_count,
                            threadRow.message_count,
                            threadRow.available_tags,
                            threadRow.applied_tags,
                            threadRow.thread_metadata
                        ]);
                        results.threadsInserted++;
                        console.log({ message: 'Inserted new thread', threadId: id });
                    } else {
                        // Compare fields
                        let changed = false;
                        for (const key of Object.keys(threadRow)) {
                            if (dbThread[key] != threadRow[key]) {
                                changed = true;
                                break;
                            }
                        }
                        if (changed) {
                            await d1.d1Query(`
                                UPDATE discord_threads SET
                                    thread_name=?, topic=?, owner_id=?, owner_nickname=?, parent_id=?,
                                    member_count=?, message_count=?, available_tags=?, applied_tags=?, thread_metadata=?
                                WHERE thread_id=?
                            `, [
                                threadRow.thread_name,
                                threadRow.topic,
                                threadRow.owner_id,
                                threadRow.owner_nickname,
                                threadRow.parent_id,
                                threadRow.member_count,
                                threadRow.message_count,
                                threadRow.available_tags,
                                threadRow.applied_tags,
                                threadRow.thread_metadata,
                                threadRow.thread_id
                            ]);
                            results.threadsUpdated++;
                            console.log({ message: 'Updated thread', threadId: id });
                        } else {
                            results.threadsUnchanged++;
                        }
                    }
                    if (thread.parent_id) uniqueParentIds.add(thread.parent_id);
                    results.threadsProcessed++;
                }
            } else {
                console.log({ message: 'No active threads found in the guild' });
            }
            // Insert/update channel tags
            console.log({ message: 'Fetching channel info for unique parent channels', uniqueChannelCount: uniqueParentIds.size });
            for (const channelId of uniqueParentIds) {
                try {
                    const channelInfo = await rest.get(Routes.channel(channelId));
                    if (channelInfo && channelInfo.available_tags && channelInfo.available_tags.length > 0) {
                        for (const tag of channelInfo.available_tags) {
                            const { id: tagId, name, emoji } = tag;
                            const emojiInfo = emoji ? (emoji.name || null) : null;
                            const tagKey = `${channelId}:${tagId}`;
                            const dbTag = dbTags[tagKey];
                            if (!dbTag) {
                                await d1.d1Query(`
                                    INSERT INTO discord_channel_tags (parent_id, tag_id, tag_name, tag_emoji)
                                    VALUES (?, ?, ?, ?)
                                `, [channelId, tagId, name, emojiInfo]);
                                results.tagsInserted++;
                                console.log({ message: 'Inserted new channel tag', channelId, tagId });
                            } else {
                                if (dbTag.tag_name !== name || dbTag.tag_emoji !== emojiInfo) {
                                    await d1.d1Query(`
                                        UPDATE discord_channel_tags SET tag_name=?, tag_emoji=?
                                        WHERE parent_id=? AND tag_id=?
                                    `, [name, emojiInfo, channelId, tagId]);
                                    results.tagsUpdated++;
                                    console.log({ message: 'Updated channel tag', channelId, tagId });
                                } else {
                                    results.tagsUnchanged++;
                                }
                            }
                        }
                    } else {
                        console.log({ message: 'No tags found for channel or channel not accessible', channelId });
                    }
                } catch (error) {
                    console.error({
                        message: 'Error fetching or storing channel tags',
                        channelId,
                        error: error.message
                    });
                }
            }
            // Remove threads from DB that no longer exist in Discord
            const discordThreadIds = new Set((activeThreads.threads || []).map(t => t.id));
            const dbThreadIds = Object.keys(dbThreads);
            let threadsDeleted = 0;
            for (const dbThreadId of dbThreadIds) {
                if (!discordThreadIds.has(dbThreadId)) {
                    await d1.d1Query('DELETE FROM discord_threads WHERE thread_id = ?', [dbThreadId]);
                    threadsDeleted++;
                    console.log({ message: 'Deleted thread from DB (no longer active)', threadId: dbThreadId });
                }
            }
            results.threadsDeleted = threadsDeleted;
        } catch (error) {
            console.error({
                message: 'Fatal error in executeScheduledTask',
                error: error.message,
                stack: error.stack
            });
            results.success = false;
            results.errors.push({ message: error.message });
        }
        const executionTime = Date.now() - startTime;
        console.log({
            message: 'Completed task',
            status: results.success ? 'success' : 'failure',
            threadsProcessed: results.threadsProcessed,
            threadsInserted: results.threadsInserted,
            threadsUpdated: results.threadsUpdated,
            threadsUnchanged: results.threadsUnchanged,
            threadsDeleted: results.threadsDeleted,
            tagsInserted: results.tagsInserted,
            tagsUpdated: results.tagsUpdated,
            tagsUnchanged: results.tagsUnchanged,
            executionTimeMs: executionTime
        });
        if (results.errors.length > 0) {
            console.error({
                message: 'Encountered errors',
                errorCount: results.errors.length,
                errors: results.errors
            });
        }
        return results;
    }
}