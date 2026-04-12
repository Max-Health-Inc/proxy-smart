-- Initialize database for Keycloak
-- This script creates the main database that Keycloak will use for persistent storage
SELECT 'CREATE DATABASE keycloak' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec

-- Grant privileges to the postgres user
GRANT ALL PRIVILEGES ON DATABASE keycloak TO postgres;

-- Note: Keycloak will automatically create its own tables on startup
-- when using the PostgreSQL database provider
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- HAPI FHIR server database
SELECT 'CREATE DATABASE hapi' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hapi')\gexec
GRANT ALL PRIVILEGES ON DATABASE hapi TO postgres;
