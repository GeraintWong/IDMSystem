import Database from "better-sqlite3";
import { emit } from "process";

const db = new Database("./lib/databases/SQLites/credon.sqlite");

export function initializeDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS credon (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL,
            email TEXT NOT NULL,
            connectionId TEXT,
            credExchangeId TEXT,
            status TEXT
        )
    `);
}

// Insert a new credential with default state as 'active'
export function insertCredential(label: string, email: string) {
    const stmt = db.prepare("INSERT INTO credon (label, email, status) VALUES (?, ?, ?)");
    stmt.run(label, email, "valid");
}

// Update credential state (e.g., set to 'revoked')
export function updateCredentialStatus(id: number, newState: string) {
    const stmt = db.prepare("UPDATE credon SET status = ? WHERE email = ?");
    stmt.run(newState, id);
}

export function updateEmail(label: string, newEmail: string){
    try {
        console.log(`🛠 Updating email for ${label} to ${newEmail}`);
        
        const stmt = db.prepare("UPDATE credon SET email = ? WHERE label = ?");
        const result = stmt.run(newEmail, label);

        console.log("🔄 Update result:", result);

        return result.changes > 0;
    } catch (error) {
        console.error("Database update error:", error);
        return false;
    }
}

export function updateConnectionId(label: string, connectionId: string): boolean {
    try {
        console.log(`🛠 Updating connectionId for ${label} to ${connectionId}`);
        
        const stmt = db.prepare("UPDATE credon SET connectionId = ? WHERE label = ?");
        const result = stmt.run(connectionId, label);

        console.log("🔄 Update result:", result);

        return result.changes > 0;
    } catch (error) {
        console.error("Database update error:", error);
        return false;
    }
}

export function updateCredExchangeId(label: string, credExchangeId: string): boolean {
    try {
        console.log(`🛠 Updating credExchangeId for ${label} to ${credExchangeId}`);
        
        const stmt = db.prepare("UPDATE credon SET credExchangeId = ? WHERE label = ?");
        const result = stmt.run(credExchangeId, label);

        console.log("🔄 Update result:", result);

        return result.changes > 0;
    } catch (error) {
        console.error("Database update error:", error);
        return false;
    }
}

export function updateStatus(email: string, status: string): boolean {
    try {
        const stmt = db.prepare("UPDATE credon SET status = ? WHERE email = ?");
        const result = stmt.run(status, email);

        console.log(`🔄 Status updated to '${status}' for ${email}:`, result);

        return result.changes > 0;
    } catch (error) {
        console.error("Database update error:", error);
        return false;
    }
}

export function updateStatusLabel(label: string, status: string): boolean {
    try {
        const stmt = db.prepare("UPDATE credon SET status = ? WHERE label = ?");
        const result = stmt.run(status, label);

        console.log(`🔄 Status updated to '${status}' for ${label}:`, result);

        return result.changes > 0;
    } catch (error) {
        console.error("Database update error:", error);
        return false;
    }
}

// Retrieve all credentials
export function getCredentials() {
    return db.prepare("SELECT * FROM credon").all().map((record: any) => ({
        id: record.id,
        label: record.label,
        email: record.email,
        connectionId: record.connectionId,
        credExchangeId: record.credExchangeId,
        status: record.status,
    }));
}

initializeDatabase();
