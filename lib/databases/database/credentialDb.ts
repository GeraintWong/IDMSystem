import Database from "better-sqlite3";

const db = new Database("./lib/databases/SQLites/credentials.sqlite");

export function initializeDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            attributes TEXT NOT NULL
        )
    `);
}

export function insertCredential(email: string, attributes: Record<string, string>) {
    const stmt = db.prepare("INSERT INTO credentials (email, attributes) VALUES (?, ?)");
    stmt.run(email, JSON.stringify(attributes));
}

export function getCredentials() {
    return db.prepare("SELECT * FROM credentials").all().map((record: any) => ({
        id: record.id,
        email: record.email,
        attributes: JSON.parse(record.attributes),
    }));
}

initializeDatabase();
