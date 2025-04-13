-- Migrations file: 20231120000001_create_tables.sql

-- Create Items Table
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    "itemId" TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    width REAL NOT NULL,
    depth REAL NOT NULL,
    height REAL NOT NULL,
    mass REAL,
    priority INTEGER NOT NULL DEFAULT 50,
    "expiryDate" DATETIME,
    "usageLimit" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "preferredZone" TEXT,
    status TEXT CHECK(status IN ('active', 'expired', 'depleted', 'disposed')) NOT NULL DEFAULT 'active'
);

-- Create Containers Table
CREATE TABLE IF NOT EXISTS containers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    "containerId" TEXT NOT NULL UNIQUE,
    zone TEXT NOT NULL,
    width REAL NOT NULL,
    depth REAL NOT NULL,
    height REAL NOT NULL,
    "isWasteContainer" BOOLEAN,
    "maxWeightCapacity" REAL
);

-- Create Placements Table
CREATE TABLE IF NOT EXISTS placements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    "itemId_fk" TEXT NOT NULL UNIQUE REFERENCES items("itemId") ON DELETE CASCADE,
    "containerId_fk" TEXT NOT NULL REFERENCES containers("containerId") ON DELETE CASCADE,
    start_w REAL NOT NULL,
    start_d REAL NOT NULL,
    start_h REAL NOT NULL,
    end_w REAL NOT NULL,
    end_d REAL NOT NULL,
    end_h REAL NOT NULL
);

-- Create Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_items_itemId ON items("itemId");
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_preferredZone ON items("preferredZone");
CREATE INDEX IF NOT EXISTS idx_containers_containerId ON containers("containerId");
CREATE INDEX IF NOT EXISTS idx_containers_zone ON containers(zone);
CREATE INDEX IF NOT EXISTS idx_placements_itemId ON placements("itemId_fk");
CREATE INDEX IF NOT EXISTS idx_placements_containerId ON placements("containerId_fk"); 