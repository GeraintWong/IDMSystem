import Database from "better-sqlite3";

const db = new Database("./lib/databases/SQLites/credentials.sqlite");

export function initializeDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT,
            email TEXT NOT NULL,
            attributes TEXT NOT NULL,
            connectionId TEXT,
            credExchangeId TEXT,
            status TEXT
        )
    `);
}

export function insertCredential(email: string, attributes: Record<string, string>,) {
    const stmt = db.prepare("INSERT INTO credentials (email, attributes, status) VALUES (?, ?, ?)");
    stmt.run(email, JSON.stringify(attributes), "valid");
}

export function getCredentials() {
    return db.prepare("SELECT * FROM credentials").all().map((record: any) => ({
        id: record.id,
        label: record.label,
        email: record.email,
        attributes: JSON.parse(record.attributes),
        connectionId: record.connectionId,
        credExchangeId: record.credExchangeId,
        status: record.status,
        comment: record.comment,
    }));
}

export function updateConnectionId(email: string, connectionId: string): boolean {
    try {
        console.log(`🛠 Updating connectionId for ${email} to ${connectionId}`);
        
        const stmt = db.prepare("UPDATE credentials SET connectionId = ? WHERE email = ?");
        const result = stmt.run(connectionId, email);

        console.log("🔄 Update result:", result);

        return result.changes > 0;
    } catch (error) {
        console.error("Database update error:", error);
        return false;
    }
}

export function updateCredExchangeId(email: string, credExchangeId: string): boolean {
    try {
        const stmt = db.prepare("UPDATE credentials SET credExchangeId = ? WHERE email = ?");
        const result = stmt.run(credExchangeId, email)

        console.log("🔄 Update result:", result);

        return result.changes > 0;
    } catch (error) {
        console.error("Database update error:", error);
        return false;
    }
}

export function updateStatus(email: string, status: string): boolean {
    try {
        const stmt = db.prepare("UPDATE credentials SET status = ? WHERE email = ?");
        const result = stmt.run(status, email);

        console.log(`🔄 Status updated to '${status}' for ${email}:`, result);

        return result.changes > 0;
    } catch (error) {
        console.error("Database update error:", error);
        return false;
    }
}

export function updateLabel(email: string, newLabel: string): boolean {
    try {
        console.log(`🛠 Updating label for ${email} to ${newLabel}`);
        
        const stmt = db.prepare("UPDATE credentials SET label = ? WHERE email = ?");
        const result = stmt.run(newLabel, email);
        
        console.log("🔄 Update result:", result);
        
        return result.changes > 0;
    } catch (error) {
        console.error("Database update error:", error);
        return false;
    }
}

export function updateEmailByLabel(label: string, newEmail: string): boolean {
    try {
        console.log(`🛠 Updating email for label ${label} to ${newEmail}`);
        
        const stmt = db.prepare("UPDATE credentials SET email = ? WHERE label = ?");
        const result = stmt.run(newEmail, label);
        
        console.log("🔄 Update result:", result);
        
        return result.changes > 0;
    } catch (error) {
        console.error("Database update error:", error);
        return false;
    }
}


initializeDatabase();