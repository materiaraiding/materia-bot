import fetch from 'node-fetch';
import {
    upsertPartyFinderListing,
    markListingsInactive
} from '../tooling/partyFinderDb.js';

// define which worlds should be included in the party finder listings for filtering
const worldsToInclude = [
    'Ravana',
    'Sophia',
    'Sephirot',
    'Bismark',
    'Zurvan',
];

// Configuration for Discord embed display
const PARTY_FINDER_CHANNELS = {
    // Map of guild IDs to channel IDs where embeds should be posted
    // Format: 'guildId': 'channelId'
    '895516967543390249': '1386584602751012974', // Example entry
};

// Function to fetch party finder listings from the API
async function fetchPartyFinderListings() {
    try {
        const response = await fetch('https://materiaraiding.com/api/partyfinder');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error({
            message: 'Error fetching party finder listings',
            error: error.message,
            stack: error.stack,
            url: 'https://materiaraiding.com/api/partyfinder',
            timestamp: new Date().toISOString()
        });
        return null;
    }
}

// Function to filter listings by category
function filterListingsByCategory(listings, categoryName) {
    if (!listings || !Array.isArray(listings)) {
        return [];
    }

    return listings.filter(item => {
        return item?.listing?.category === categoryName;
    });
}

// Function to filter party finder listings by world
function filterListingsByWorld(listings) {
    if (!Array.isArray(listings) || listings.length === 0) {
        return [];
    }

    return listings.filter(item => {
        // Check if the listing has a created_world and its name is in the worldsToInclude array
        return item.listing &&
               item.listing.created_world &&
               item.listing.created_world.name &&
               worldsToInclude.includes(item.listing.created_world.name);
    });
}

// Function to get filtered party finder listings
async function getFilteredPartyFinderListings() {
    const allListings = await fetchPartyFinderListings();
    if (!allListings) {
        return [];
    }

    // Apply both world filter and category filter (HighEndDuty only)
    const filteredByWorld = filterListingsByWorld(allListings);
    const fullyFiltered = filterListingsByCategory(filteredByWorld, 'HighEndDuty');

    return fullyFiltered;
}

// Export the module using ES module syntax instead of CommonJS
export const data = {
    name: 'partyFinderListings',
    description: 'Fetches the latest party finder listings from https://materiaraiding.com/api/partyfinder and manages them as discord embeds and stores them in a database to be updated over time.',
    cron: '* * * * *', // Runs every minute
};

export async function executeScheduledTask(client) {
    // Get listings that are both from selected worlds AND are HighEndDuty
    const filteredListings = await getFilteredPartyFinderListings();

    if (!filteredListings || filteredListings.length === 0) {
        console.log('No qualified listings found (must be HighEndDuty and from selected worlds)');
        return;
    }

    // Store each listing in database
    const activeListingIds = [];
    for (const item of filteredListings) {
        const l = item.listing;
        // Flatten and map the listing to DB schema
        const nowIso = new Date().toISOString();

        // Get duty info from the correct nested structure
        const dutyInfo = l.duty_info || {};
        const dutyName = dutyInfo.name ? (dutyInfo.name.en || dutyInfo.name) : null;

        const dbListing = {
            listing_id: l.id,
            created_at: item.created_at || nowIso, // Use item.created_at instead of l.created_at
            updated_at: item.updated_at || nowIso, // Use item.updated_at instead of l.updated_at
            time_left: item.time_left,
            seconds_remaining: l.seconds_remaining,
            recruiter: l.recruiter,
            description: l.description?.en || JSON.stringify(l.description) || '',
            created_world_id: l.created_world?.id,
            created_world_name: l.created_world?.name,
            home_world_id: l.home_world?.id,
            home_world_name: l.home_world?.name,
            current_world_id: l.current_world?.id,
            current_world_name: l.current_world?.name,
            duty_id: dutyInfo?.id, // Using dutyInfo instead of l.duty
            duty_name: dutyName,
            duty_high_end: dutyInfo?.high_end ? 1 : 0,
            content_kind_id: dutyInfo?.content_kind_id,
            content_kind: dutyInfo?.content_kind,
            category: l.category,
            duty_type: l.duty_type,
            beginners_welcome: l.beginners_welcome ? 1 : 0,
            min_item_level: l.min_item_level,
            num_parties: l.num_parties,
            last_server_restart: l.last_server_restart,
            objective: l.objective,
            conditions: l.conditions,
            duty_finder_settings: l.duty_finder_settings,
            loot_rules: l.loot_rules,
            search_area: l.search_area,
            slots: l.slots,
            slots_filled: l.slots_filled
        };
        await upsertPartyFinderListing(dbListing);
        activeListingIds.push(l.id);
    }

    // Clean up expired listings
    if (activeListingIds.length > 0) {
        await markListingsInactive(activeListingIds);
    }

    // Manage Discord embeds for the listings
    // (to be implemented)
}
