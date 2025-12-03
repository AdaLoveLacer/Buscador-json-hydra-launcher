#!/usr/bin/env python3

"""
Buscador JSON - Database Initialization Script
Initializes SQLite database with schema, indices, and optional seed data
"""

import os
import sys
import sqlite3
import argparse
import logging
from pathlib import Path
from datetime import datetime

# ─── Configuration ─────────────────────────────────────────────────────────

DEFAULT_DB_PATH = "./db.sqlite"
LOG_FORMAT = "%(asctime)s - %(levelname)s - %(message)s"

# SQL Schema
SCHEMA = """
-- ═══════════════════════════════════════════════════════════════════════════
-- Buscador JSON - Database Schema
-- ═══════════════════════════════════════════════════════════════════════════

-- Files Table
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    original_filename TEXT NOT NULL,
    filepath TEXT NOT NULL UNIQUE,
    file_hash TEXT,
    file_size_bytes INTEGER,
    content_type TEXT DEFAULT 'application/json',
    
    -- Content metadata
    json_path TEXT,
    json_keys TEXT,  -- Comma-separated list of top-level keys
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accessed_at TIMESTAMP,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived', 'deleted')),
    processing_status TEXT DEFAULT 'completed' CHECK(processing_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    
    -- Indexing
    is_indexed INTEGER DEFAULT 1,
    last_indexed_at TIMESTAMP,
    
    -- User tracking (future)
    user_id INTEGER,
    upload_session_id TEXT,
    
    -- Notes
    description TEXT,
    tags TEXT  -- Comma-separated
);

-- Search Results Cache
CREATE TABLE IF NOT EXISTS search_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_hash TEXT NOT NULL UNIQUE,
    search_query TEXT NOT NULL,
    results_json TEXT,
    result_count INTEGER,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Metadata
    search_time_ms INTEGER,
    sort_by TEXT DEFAULT 'relevance'
);

-- Search Statistics
CREATE TABLE IF NOT EXISTS search_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    results_count INTEGER,
    execution_time_ms INTEGER,
    
    -- Filters used
    filters_json TEXT,
    
    -- Timestamp
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- User tracking
    user_id INTEGER,
    session_id TEXT
);

-- File Access Log (for analytics)
CREATE TABLE IF NOT EXISTS access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('viewed', 'searched', 'downloaded', 'deleted')),
    search_query TEXT,
    
    -- Timestamp
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- User tracking
    user_id INTEGER,
    session_id TEXT,
    ip_address TEXT,
    
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Configuration/Metadata
CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── Indices for Performance ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_files_filename ON files(filename);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
CREATE INDEX IF NOT EXISTS idx_files_processing_status ON files(processing_status);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);

CREATE INDEX IF NOT EXISTS idx_search_cache_query_hash ON search_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires_at ON search_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_search_stats_searched_at ON search_stats(searched_at);
CREATE INDEX IF NOT EXISTS idx_search_stats_user_id ON search_stats(user_id);

CREATE INDEX IF NOT EXISTS idx_access_logs_file_id ON access_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_at ON access_logs(accessed_at);
CREATE INDEX IF NOT EXISTS idx_access_logs_action ON access_logs(action);

-- ─── Initialization Data ───────────────────────────────────────────────────

-- Insert metadata
INSERT OR IGNORE INTO metadata (key, value) VALUES 
    ('db_version', '1.0'),
    ('created_at', CURRENT_TIMESTAMP),
    ('last_migrated', CURRENT_TIMESTAMP),
    ('schema_version', '1');

"""

# ─── Logging Setup ─────────────────────────────────────────────────────────

def setup_logging(verbose=False):
    """Setup logging configuration"""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format=LOG_FORMAT,
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('db_init.log')
        ]
    )
    return logging.getLogger(__name__)

# ─── Database Functions ────────────────────────────────────────────────────

def create_database(db_path=DEFAULT_DB_PATH, verbose=False):
    """Create and initialize database"""
    logger = setup_logging(verbose)
    
    logger.info(f"Initializing database: {db_path}")
    
    try:
        # Create directory if needed
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        
        # Check if database already exists
        db_exists = Path(db_path).exists()
        
        # Connect and execute schema
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        logger.info("Executing schema...")
        cursor.executescript(SCHEMA)
        conn.commit()
        
        # Enable WAL mode for better concurrency
        logger.info("Enabling WAL mode...")
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA cache_size=10000;")
        conn.commit()
        
        # Get database info
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        logger.info(f"Database initialized successfully!")
        logger.info(f"✓ Database file: {db_path}")
        logger.info(f"✓ Tables created: {len(tables)}")
        logger.info(f"✓ WAL mode enabled")
        
        if verbose:
            logger.debug("Tables:")
            for table in tables:
                logger.debug(f"  - {table[0]}")
        
        conn.close()
        return True
        
    except sqlite3.Error as e:
        logger.error(f"Database error: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return False

def verify_database(db_path=DEFAULT_DB_PATH, verbose=False):
    """Verify database integrity and structure"""
    logger = setup_logging(verbose)
    
    logger.info(f"Verifying database: {db_path}")
    
    try:
        if not Path(db_path).exists():
            logger.error(f"Database file not found: {db_path}")
            return False
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        expected_tables = ['files', 'search_cache', 'search_stats', 'access_logs', 'metadata']
        
        logger.info(f"Tables found: {len(tables)}")
        for table in tables:
            logger.info(f"  ✓ {table[0]}")
        
        # Check indices
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%';")
        indices = cursor.fetchall()
        logger.info(f"Indices found: {len(indices)}")
        
        # Check PRAGMA settings
        cursor.execute("PRAGMA journal_mode;")
        journal_mode = cursor.fetchone()[0]
        logger.info(f"✓ Journal mode: {journal_mode}")
        
        # Get database size
        db_size = Path(db_path).stat().st_size / 1024
        logger.info(f"✓ Database size: {db_size:.2f} KB")
        
        conn.close()
        logger.info("✓ Database verification successful!")
        return True
        
    except Exception as e:
        logger.error(f"Verification error: {e}")
        return False

def backup_database(db_path=DEFAULT_DB_PATH, verbose=False):
    """Backup existing database"""
    logger = setup_logging(verbose)
    
    if not Path(db_path).exists():
        logger.info("No existing database to backup")
        return True
    
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"{db_path}.backup.{timestamp}"
        
        logger.info(f"Backing up existing database...")
        import shutil
        shutil.copy2(db_path, backup_path)
        
        logger.info(f"✓ Backup created: {backup_path}")
        return True
        
    except Exception as e:
        logger.error(f"Backup error: {e}")
        return False

def get_database_stats(db_path=DEFAULT_DB_PATH, verbose=False):
    """Get database statistics"""
    logger = setup_logging(verbose)
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        stats = {}
        
        # Files count
        cursor.execute("SELECT COUNT(*) FROM files;")
        stats['files'] = cursor.fetchone()[0]
        
        # Cached searches
        cursor.execute("SELECT COUNT(*) FROM search_cache;")
        stats['cached_searches'] = cursor.fetchone()[0]
        
        # Search statistics
        cursor.execute("SELECT COUNT(*) FROM search_stats;")
        stats['search_stats'] = cursor.fetchone()[0]
        
        # Access logs
        cursor.execute("SELECT COUNT(*) FROM access_logs;")
        stats['access_logs'] = cursor.fetchone()[0]
        
        conn.close()
        
        if verbose:
            logger.info("Database Statistics:")
            for key, value in stats.items():
                logger.info(f"  {key}: {value}")
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        return None

# ─── Main ──────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Initialize Buscador JSON SQLite database"
    )
    
    parser.add_argument(
        "-d", "--database",
        default=DEFAULT_DB_PATH,
        help=f"Database file path (default: {DEFAULT_DB_PATH})"
    )
    
    parser.add_argument(
        "-b", "--backup",
        action="store_true",
        help="Backup existing database before initialization"
    )
    
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Verbose output"
    )
    
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Only verify database integrity, don't initialize"
    )
    
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Show database statistics"
    )
    
    args = parser.parse_args()
    logger = setup_logging(args.verbose)
    
    print("")
    print("╔═══════════════════════════════════════════════════╗")
    print("║  Buscador JSON - Database Initialization         ║")
    print("╚═══════════════════════════════════════════════════╝")
    print("")
    
    try:
        # Verify only
        if args.verify_only:
            success = verify_database(args.database, args.verbose)
            sys.exit(0 if success else 1)
        
        # Backup
        if args.backup:
            backup_database(args.database, args.verbose)
        
        # Initialize
        success = create_database(args.database, args.verbose)
        if not success:
            sys.exit(1)
        
        # Verify
        if not verify_database(args.database, args.verbose):
            sys.exit(1)
        
        # Stats
        if args.stats:
            get_database_stats(args.database, args.verbose)
        
        print("")
        logger.info("✓ Database initialization complete!")
        print("")
        
        sys.exit(0)
        
    except KeyboardInterrupt:
        logger.warning("Interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
