import express from 'express'; // ES module import
import cors from 'cors'; // ES module import
import { exec } from 'child_process'; // ES module import
import { getConnections, fetchSchemaAndCredDefIds, getWalletCredentialId, getPresentProof } from '../api/helper/helper.ts';
import { createInvitation } from '../api/invitation/createInvitation.ts'; // Import with .ts extension
import { acceptInvitation } from '../api/invitation/acceptInvitation.ts'; // Import with .ts extension
import { sendCredentialProposal } from '../api/issueCredentials/sendProposal/sendProposal.ts';
import { sendPresentation } from '../api/presentproof/holderApi/sendPresentation.ts'

const ISSUER_URL = "http://localhost:11000"; 
const HOLDER_URL = "http://localhost:11001"; 

const app = express();
app.use(express.json());
app.use(cors());

app.post('/start-agent', async (req, res) => {
    const { walletName } = req.body;

    if (!walletName) {
        return res.status(400).json({ message: 'Invalid wallet name' });
    }

    const dockerCommand = `
        docker run --platform linux/amd64 -d \
        -p 8001:8001 -p 11001:11001 \
        bcgovimages/aries-cloudagent:py3.12_1.2.0 start \
        --label ${walletName} \
        --inbound-transport http 0.0.0.0 8001 \
        --outbound-transport http \
        --admin 0.0.0.0 11001 \
        --admin-insecure-mode \
        --endpoint http://host.docker.internal:8001 \
        --genesis-url http://host.docker.internal:9000/genesis \
        --wallet-name ${walletName}CredWallet \
        --wallet-key secret \
        --wallet-type askar \
        --auto-provision \
        --auto-accept-invites \
        --auto-accept-requests \
        --auto-respond-credential-proposal \
        --auto-respond-credential-offer \
        --auto-respond-credential-request \
        --auto-store-credential \
        --preserve-exchange-records
    `;

    exec(dockerCommand, async (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            return res.status(500).json({ message: 'Failed to start Aries agent' });
        }

        // Add timeout of 10 seconds
        setTimeout(async () => {
            try {
                // Create the invitation after the timeout
                const invitationUrl = await createInvitation(ISSUER_URL);
                if (!invitationUrl) {
                    return res.status(500).json({ message: 'Failed to create invitation' });
                }

                const decodedUrl = decodeURIComponent(invitationUrl.split("oob=")[1]);
                const invitationData = JSON.parse(atob(decodedUrl));

                // Accept the invitation with the agent
                const connectionSuccessful = await acceptInvitation(invitationData);
                if (connectionSuccessful) {
                    console.log('Connection successfully established with the issuer.');
                    return res.json({ message: 'Agent started and connected to issuer' });
                } else {
                    return res.status(500).json({ message: 'Failed to establish connection with the issuer' });
                }
            } catch (connectionError) {
                console.error('Error during connection setup:', connectionError);
                return res.status(500).json({ message: 'Failed to complete connection setup' });
            }
        }, 5000); // Timeout after 10 seconds
    });
});
// Replace this with your actual logic to check agent connection
app.get('/check-connection', async (req, res) => {
    try {
        // Fetch current connections from the Aries agent API using getConnections
        const connections = await getConnections("http://localhost:11001");

        // Filter active connections
        const activeConnections = connections.filter((connection) => connection.state === 'active');

        if (activeConnections.length > 0) {
            return res.json({
                connected: true,
                connection_details: activeConnections.map(conn => ({
                    connection_id: conn.connection_id,
                    their_label: conn.their_label
                }))
            });
        } else {
            return res.json({ connected: false });
        }
    } catch (error) {
        console.error('Error checking connection:', error);
        return res.status(500).json({ message: 'Error checking connection' });
    }
});

app.get('/get-schema-and-cred-def-ids', async (req, res) => {
    try {
        // Fetch schema and credential definition IDs from the Aries agent or database
        const data = await fetchSchemaAndCredDefIds(ISSUER_URL);

        return res.json({
            schemaId: data.schemaIds,
            schemaDetails: data.schemaDetails,
            credDefId: data.credDefIds,
        });
    } catch (error) {
        console.error('Error fetching schema and cred def IDs:', error);
        res.status(500).json({ message: 'Failed to fetch schema and credential definition IDs' });
    }
});

const proposals = []; // Declare proposals array to store proposals

app.post('/send-credential-proposal', async (req, res) => {
    const { connectionId, credAttrs, comment, autoRemove, schemaId, credDefId } = req.body;
    if (!connectionId || !credAttrs || !schemaId || !credDefId) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    const credAttrsObj = {};
    credAttrs.forEach(attr => {
        credAttrsObj[attr.name] = attr.value;
    });


    const success = await sendCredentialProposal(connectionId, credAttrsObj, comment, autoRemove, schemaId, credDefId);
    if (success) {
        return res.json({ message: 'Credential proposal sent successfully' });
    } else {
        return res.status(500).json({ message: 'Failed to send credential proposal' });
    }
});

app.get("/get-proposals", (req, res) => {
    res.json(proposals);
});

app.get('/get-wallet-credentials', async (req, res) => {
    try {
        const credentials = await getWalletCredentialId(); // Await the async function

        if (!credentials || credentials.length === 0) {
            return res.status(404).json({ message: "No wallet credentials found" });
        }

        return res.json({ WalletCredentials: credentials }); // Return both referent & cred_def_id
    } catch (error) {
        console.error('Error fetching wallet credential ID:', error);
        res.status(500).json({ message: 'Failed to fetch wallet credential IDs' });
    }
});

app.post('/accept-invitation', async (req, res) => {
    const { invitationUrl } = req.body;
    if (!invitationUrl) {
        return res.status(400).json({ message: 'Missing invitation URL' });
    }
    const decodedUrl = decodeURIComponent(invitationUrl.split("oob=")[1]);
    const invitationData = JSON.parse(atob(decodedUrl));

    const success = await acceptInvitation(invitationData);
    if (success) {
       return res.json({message: 'Invitation Accepted'})
    } else {
        return res.status(500).json({ message: 'Failed to accept invitation' });
    }
});

app.get('/get-proof-request', async (req, res) => {
    try {
        const proofs = await getPresentProof(HOLDER_URL);

        if (!proofs || proofs.length === 0) {
            return res.status(404).json({ message: "No proof requests found." });
        }

        const proofRequest = proofs.find(p => p.state[0] === "request_received");
        if (!proofRequest) {
            return res.status(400).json({ message: "No valid proof request found." });
        }
        console.log(proofRequest)
        return res.json({ ProofRequest: proofRequest });
    } catch (error) {
        console.error('Error fetching proof request:', error);
        res.status(500).json({ message: 'Failed to fetch proof request' });
    }
});

app.post("/send-presentation", async (req, res) => {
    try {
        const { userConfirmed } = req.body;

        // Fetch all present-proof requests
        const proofs = await getPresentProof(HOLDER_URL);
        if (!proofs || proofs.length === 0) {
            return res.status(404).json({ message: "No proof requests found." });
        }

        // Find a valid proof request
        const proofRequest = proofs.find(p => p.state === "request-received");
        if (!proofRequest) {
            return res.status(400).json({ message: "No valid proof request found." });
        }

        // Fetch wallet credentials
        const walletResponse = await fetch("http://localhost:4000/get-wallet-credentials");
        const walletData = await walletResponse.json();

        if (!walletData || !walletData.WalletCredentials) {
            return res.status(404).json({ message: "No wallet credentials found." });
        }

        const requestedAttributes = proofRequest.by_format?.pres_request?.indy?.requested_attributes;
        let matchedCredential = null; // Declare outside to avoid undefined error

        if (requestedAttributes) {
            const credDefIds = Object.values(requestedAttributes)
                .map(attr => attr.restrictions?.[0]?.cred_def_id)
                .filter(Boolean); // Remove undefined values

            console.log("Requested Credential Definition IDs:", credDefIds);

            matchedCredential = walletData.WalletCredentials.find(cred => credDefIds.includes(cred.cred_def_id));

            console.log("Matched Credential:", matchedCredential);
        } else {
            console.log("No requested attributes found in proof request.");
        }

        // Ensure matchedCredential is valid
        if (!matchedCredential) {
            return res.status(400).json({ message: "No matching credential found." });
        }

        // Step 1: If the user has NOT confirmed yet, return the requested attributes for review
        if (!userConfirmed) {
            return res.status(200).json({
                message: "User confirmation required.",
                requestedAttributes,
                credentialId: matchedCredential.referent
            });
        }

        // Step 2: If userConfirmed is true, send the presentation
        const response = await sendPresentation(matchedCredential.referent);

        if (!response) {
            return res.status(500).json({ message: "Failed to send presentation." });
        }

        return res.status(200).json({ message: "Presentation sent successfully.", response });
    } catch (error) {
        console.error("Error in /send-presentation:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
});


app.listen(4000, () => console.log('Server running on port 4000'));
