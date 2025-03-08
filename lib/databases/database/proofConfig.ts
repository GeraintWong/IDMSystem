import Database from "better-sqlite3";

const db = new Database("./lib/databases/SQLites/proofConfig.sqlite");

export function initializeDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL,
            credDefId TEXT NOT NULL,
            attributes TEXT NOT NULL
        )
    `);
}

export function insertProofConfig(label:string, credDefId: string, attributes: Record<string, string>) {
    const stmt = db.prepare("INSERT INTO credentials (label, credDefId, attributes) VALUES (?, ?, ?)");
    stmt.run(label, credDefId, JSON.stringify(attributes));
}

export function getProofConfig() {
    return db.prepare("SELECT * FROM credentials").all().map((record: any) => ({
        id: record.id,
        label: record.label,
        credDefId: record.credDefId,
        attributes: JSON.parse(record.attributes),
    }));
}

initializeDatabase();
