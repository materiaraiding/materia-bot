const { d1Query } = require('./d1');

/**
 * Upsert a party finder listing into the database.
 * @param {object} listing - The listing object to upsert.
 */
async function upsertPartyFinderListing(listing) {
    // Log in standard format
    console.log({
        message: `Processing party finder listing: ${listing.listing_id}`,
        duty: listing.duty_name || 'Unknown duty',
        world: listing.created_world_name,
        timestamp: new Date().toISOString()
    });

    // Prepare SQL for upsert (insert or update on conflict)
    const sql = `
        INSERT INTO party_finder_listings (
            listing_id, created_at, updated_at, time_left, seconds_remaining, recruiter, description,
            created_world_id, created_world_name, home_world_id, home_world_name, current_world_id, current_world_name,
            duty_id, duty_name, duty_high_end, content_kind_id, content_kind,
            category, duty_type, beginners_welcome, min_item_level, num_parties, last_server_restart,
            objective_json, conditions_json, duty_finder_settings_json, loot_rules_json, search_area_json,
            slots_json, slots_filled_json, is_active
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, 1
        )
        ON CONFLICT(listing_id) DO UPDATE SET
            updated_at=excluded.updated_at,
            time_left=excluded.time_left,
            seconds_remaining=excluded.seconds_remaining,
            recruiter=excluded.recruiter,
            description=excluded.description,
            created_world_id=excluded.created_world_id,
            created_world_name=excluded.created_world_name,
            home_world_id=excluded.home_world_id,
            home_world_name=excluded.home_world_name,
            current_world_id=excluded.current_world_id,
            current_world_name=excluded.current_world_name,
            duty_id=excluded.duty_id,
            duty_name=excluded.duty_name,
            duty_high_end=excluded.duty_high_end,
            content_kind_id=excluded.content_kind_id,
            content_kind=excluded.content_kind,
            category=excluded.category,
            duty_type=excluded.duty_type,
            beginners_welcome=excluded.beginners_welcome,
            min_item_level=excluded.min_item_level,
            num_parties=excluded.num_parties,
            last_server_restart=excluded.last_server_restart,
            objective_json=excluded.objective_json,
            conditions_json=excluded.conditions_json,
            duty_finder_settings_json=excluded.duty_finder_settings_json,
            loot_rules_json=excluded.loot_rules_json,
            search_area_json=excluded.search_area_json,
            slots_json=excluded.slots_json,
            slots_filled_json=excluded.slots_filled_json,
            is_active=1
    `;

    // Create params array for the SQL query
    const params = [
        listing.listing_id,
        listing.created_at,
        listing.updated_at,
        listing.time_left,
        listing.seconds_remaining,
        listing.recruiter,
        listing.description,
        listing.created_world_id,
        listing.created_world_name,
        listing.home_world_id,
        listing.home_world_name,
        listing.current_world_id,
        listing.current_world_name,
        listing.duty_id,
        listing.duty_name,
        listing.duty_high_end,
        listing.content_kind_id,
        listing.content_kind,
        listing.category,
        listing.duty_type,
        listing.beginners_welcome,
        listing.min_item_level,
        listing.num_parties,
        listing.last_server_restart,
        JSON.stringify(listing.objective || {}),
        JSON.stringify(listing.conditions || {}),
        JSON.stringify(listing.duty_finder_settings || {}),
        JSON.stringify(listing.loot_rules || {}),
        JSON.stringify(listing.search_area || {}),
        JSON.stringify(listing.slots || []),
        JSON.stringify(listing.slots_filled || [])
    ];

    try {
        const result = await d1Query(sql, params);
        return result;
    } catch (error) {
        console.error({
            message: 'Error upserting party finder listing',
            listing_id: listing.listing_id,
            duty: listing.duty_name,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

/**
 * Mark listings as inactive if their IDs are not in the provided list.
 * @param {number[]} activeListingIds - Array of currently active listing IDs.
 */
async function markListingsInactive(activeListingIds) {
    if (!activeListingIds || activeListingIds.length === 0) {
        return;
    }

    console.log({
        message: 'Marking inactive listings',
        activeCount: activeListingIds.length,
        timestamp: new Date().toISOString()
    });

    const sql = `UPDATE party_finder_listings SET is_active=0 WHERE listing_id NOT IN (${activeListingIds.map(() => '?').join(',')})`;

    try {
        const result = await d1Query(sql, activeListingIds);
        const rowsAffected = result?.meta?.changes || 0;
        if (rowsAffected > 0) {
            console.log({
                message: 'Listings marked as inactive',
                count: rowsAffected,
                timestamp: new Date().toISOString()
            });
        }
        return result;
    } catch (error) {
        console.error({
            message: 'Error marking listings as inactive',
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

/**
 * Get all active listings from the database.
 */
async function getActiveListings() {
    const sql = `SELECT * FROM party_finder_listings WHERE is_active=1`;

    try {
        return await d1Query(sql);
    } catch (error) {
        console.error({
            message: 'Error retrieving active listings',
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

module.exports = {
    upsertPartyFinderListing,
    markListingsInactive,
    getActiveListings,
};
