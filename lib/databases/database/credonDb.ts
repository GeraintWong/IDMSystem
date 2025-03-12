import Database from "better-sqlite3";

const db = new Database("./lib/databases/SQLites/credon.sqlite");

export function initializeDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS credon (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL,
            connectionId TEXT NOT NULL,
            state TEXT NOT NULL
        )
    `);
}

// Insert a new credential with default state as 'active'
export function insertCredential(label: string, connectionId: string, state: string) {
    const stmt = db.prepare("INSERT INTO credon (label, connectionId, state) VALUES (?, ?, ?)");
    stmt.run(label, connectionId, state);
}

// Update credential state (e.g., set to 'revoked')
export function updateCredentialState(id: number, newState: string) {
    const stmt = db.prepare("UPDATE credon SET state = ? WHERE id = ?");
    stmt.run(newState, id);
}

// Retrieve all credentials
export function getCredentials() {
    return db.prepare("SELECT * FROM credon").all().map((record: any) => ({
        id: record.id,
        label: record.label,
        connectionId: record.connectionId,
        state: record.state,
    }));
}

initializeDatabase();
