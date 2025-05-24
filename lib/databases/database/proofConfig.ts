import Database from "better-sqlite3";

const db = new Database("./lib/databases/SQLites/proofConfig.sqlite");

export function initializeDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL,
            credDefId TEXT NOT NULL,
            attributes TEXT,
            predicates TEXT,
            CHECK 
            (
                (attributes IS NOT NULL AND attributes != '')
                OR
                (predicates IS NOT NULL AND predicates != '')
            )
        )
    `);
}

export function insertProofConfig(
    label: string,
    credDefId: string,
    attributes?: Record<string, string>,
    predicates?: { operation: string; p_value: number }
) {
    if ((!attributes || Object.keys(attributes).length === 0) &&
        (!predicates || !predicates.operation || predicates.p_value === undefined)) {
        throw new Error("Either attributes or predicate must be provided");
    }

    const stmt = db.prepare(`
        INSERT INTO credentials (label, credDefId, attributes, predicates)
        VALUES (?, ?, ?, ?)
    `);

    stmt.run(
        label,
        credDefId,
        attributes ? JSON.stringify(attributes) : null,
        predicates ? JSON.stringify(predicates) : null
    );
}

export function getProofConfig() {
    return db.prepare("SELECT * FROM credentials").all().map((record: any) => ({
        id: record.id,
        label: record.label,
        credDefId: record.credDefId,
        attributes: record.attributes ? JSON.parse(record.attributes) : null,
        predicates: record.predicates ? JSON.parse(record.predicates) : null,
    }));
}


initializeDatabase();
