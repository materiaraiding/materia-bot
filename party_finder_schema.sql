-- Simplified Schema for Party Finder listings database with only two tables

-- Drop tables if they exist
DROP TABLE IF EXISTS party_finder_discord_embeds;
DROP TABLE IF EXISTS party_finder_listings;

-- Consolidated table for party finder listings
CREATE TABLE party_finder_listings (
    listing_id INTEGER PRIMARY KEY,
    created_at TEXT NOT NULL, -- SQLite timestamp as TEXT
    updated_at TEXT NOT NULL, -- SQLite timestamp as TEXT
    time_left REAL,
    seconds_remaining INTEGER,
    recruiter TEXT,
    description TEXT,

    -- World information (previously in game_worlds table)
    created_world_id INTEGER,
    created_world_name TEXT,
    home_world_id INTEGER,
    home_world_name TEXT,
    current_world_id INTEGER,
    current_world_name TEXT,

    -- Duty information (previously in duty_info table)
    duty_id INTEGER,
    duty_name TEXT,
    duty_high_end INTEGER, -- SQLite doesn't have true BOOLEAN type
    content_kind_id INTEGER,
    content_kind TEXT,

    -- Listing details
    category TEXT,
    duty_type TEXT,
    beginners_welcome INTEGER, -- Using INTEGER instead of BOOLEAN
    min_item_level INTEGER,
    num_parties INTEGER,
    last_server_restart INTEGER,

    -- JSON fields for complex data
    objective_json TEXT,
    conditions_json TEXT,
    duty_finder_settings_json TEXT,
    loot_rules_json TEXT,
    search_area_json TEXT,

    -- Slots information (previously in separate tables)
    slots_json TEXT, -- JSON array of available jobs for slots
    slots_filled_json TEXT, -- JSON array of jobs that filled slots

    -- Status tracking
    is_active INTEGER DEFAULT 1 -- Using INTEGER instead of BOOLEAN
);

-- Table to track Discord embed messages for party finder listings
CREATE TABLE party_finder_discord_embeds (
    id INTEGER PRIMARY KEY,
    listing_id INTEGER NOT NULL,
    message_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, -- SQLite timestamp as TEXT
    last_updated_at TEXT DEFAULT CURRENT_TIMESTAMP, -- SQLite timestamp as TEXT
    embed_hash TEXT, -- Hash of the current embed content to determine if an update is needed
    is_active INTEGER DEFAULT 1, -- Using INTEGER instead of BOOLEAN
    FOREIGN KEY(listing_id) REFERENCES party_finder_listings(listing_id)
);
