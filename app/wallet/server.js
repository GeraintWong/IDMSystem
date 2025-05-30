import express from 'express'; // ES module import
import cors from 'cors'; // ES module import
import { exec } from 'child_process'; // ES module import
import { getConnections, fetchSchemaAndCredDefIds, getWalletCredentialId, getPresentProof, deleteWalletCredential, getIssueCredential, deleteIssueCredential } from '../api/helper/helper.ts';
import { createInvitation } from '../api/invitation/createInvitation.ts'; // Import with .ts extension
import { acceptInvitation } from '../api/invitation/acceptInvitation.ts'; // Import with .ts extension
import { sendCredentialProposal } from '../api/issueCredentials/sendProposal/sendProposal.ts';
import { sendPresentation } from '../api/presentproof/holderApi/sendPresentation.ts'
import { extractText } from '../../lib/OCR.ts'
import { v4 as uuidv4 } from 'uuid';

import * as dotenv from 'dotenv';
dotenv.config();
import nodemailer from 'nodemailer'

const ISSUER_URL = "http://localhost:11000"; 
const HOLDER_URL = "http://localhost:11001"; 

const app = express();
const app2 = express();
app.use(express.json());
app.use(cors());
app2.use(express.json())
app2.use(cors())

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
        --preserve-exchange-records \
    `;

    exec(dockerCommand, async (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            return res.status(500).json({ message: 'Failed to start Aries agent' });
        }

        setTimeout(async () => {
            try {
                const invitationUrl = await createInvitation(ISSUER_URL);
                if (!invitationUrl) {
                    return res.status(500).json({ message: 'Failed to create invitation' });
                }

                const decodedUrl = decodeURIComponent(invitationUrl.split("oob=")[1]);
                const invitationData = JSON.parse(atob(decodedUrl));

                const connectionSuccessful = await acceptInvitation(HOLDER_URL, invitationData);
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
        }, 5000); 
    });
});

app.get('/check-connection', async (req, res) => {
    try {
        const connections = await getConnections(HOLDER_URL);

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

const proposals = [];

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
        const credentials = await getWalletCredentialId(HOLDER_URL); 

        if (!credentials || credentials.length === 0) {
            return res.status(404).json({ message: "No wallet credentials found" });
        }

        function extractCredName(credDefId) {
            if (!credDefId) return "Unknown";
            let parts = credDefId.split(":");
            return parts.length > 4 ? parts[4].replace(/_/g, " ") : "Unknown";
        }

        const formattedCredentials = credentials.map(cred => ({
            referent: cred.referent,
            cred_def_id: cred.cred_def_id,
            cred_def_name: extractCredName(cred.cred_def_id),
        }));

        return res.json({ WalletCredentials: formattedCredentials });

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

    const success = await acceptInvitation(HOLDER_URL, invitationData);
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

        const proofs = await getPresentProof(HOLDER_URL);
        if (!proofs || proofs.length === 0) {
            return res.status(404).json({ message: "No proof requests found." });
        }

        const proofRequest = proofs.find(p => p.state === "request-received");
        if (!proofRequest) {
            return res.status(400).json({ message: "No valid proof request found." });
        }

        const walletResponse = await fetch("http://localhost:4000/get-wallet-credentials");
        const walletData = await walletResponse.json();

        if (!walletData || !walletData.WalletCredentials) {
            return res.status(404).json({ message: "No wallet credentials found." });
        }

        const requestedAttributes = proofRequest.by_format?.pres_request?.indy?.requested_attributes;
        const requestedPredicates = proofRequest.by_format?.pres_request?.indy.requested_predicates;
        let matchedCredential = null; 

        if (requestedAttributes) {
            const credDefIds = Object.values(requestedAttributes)
                .map(attr => attr.restrictions?.[0]?.cred_def_id)
                .filter(Boolean); 

            console.log("Requested Credential Definition IDs:", credDefIds);

            matchedCredential = walletData.WalletCredentials.find(cred => credDefIds.includes(cred.cred_def_id));

            console.log("Matched Credential:", matchedCredential);
        } else {
            console.log("No requested attributes found in proof request.");
        }

        if (!matchedCredential) {
            return res.status(400).json({ message: "No matching credential found." });
        }

        if (!userConfirmed) {
            return res.status(200).json({
                message: "User confirmation required.",
                requestedAttributes,
                requestedPredicates,
                credentialId: matchedCredential.referent
            });
        }

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

let otpStore = {};

//Email type shiii
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,  
    },
  });

  app.post("/send-otp", async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP
    otpStore[email] = otp;
  
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Verification Code",
      text: `Your verification code is: ${otp}. It expires in 5 minutes.`,
    };
  
    try {
      await transporter.sendMail(mailOptions);
      res.json({ message: "OTP sent successfully!" });
    } catch (error) {
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  app.post("/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    if (otpStore[email] && otpStore[email] == otp) {
      delete otpStore[email];
      res.json({ message: "OTP verified. Proceed with agent creation." });
    } else {
      alert("Invalid OTP")
      res.status(400).json({ error: "Invalid OTP" });
    }
  });

  app.post("/webhook", async (req, res) => {
    try {
        const { cred_def_id, status, reason } = req.body;

        if (status === "revoked") {
            console.log(`🔴 Credential revoked: ${cred_def_id}, Reason: ${reason}`);

            const walletResponse = await fetch("http://localhost:4000/get-wallet-credentials");
            
            if (!walletResponse.ok) {
                throw new Error(`Failed to fetch wallet credentials: ${walletResponse.statusText}`);
            }

            const walletData = await walletResponse.json();
            console.log("🔍 Wallet Data:", walletData);

            const matchingCredential = walletData.WalletCredentials.find(cred => cred.cred_def_id === cred_def_id);

            if (matchingCredential) {
                console.log("Matching Credential Found:", matchingCredential);
                const referentId = matchingCredential.referent
                const deleteResponse = await deleteWalletCredential(HOLDER_URL, referentId);

                if (!deleteResponse) {
                    throw new Error("Failed to delete credential");
                }

                console.log("🗑️ Credential successfully deleted!");
            } else {
                console.log("⚠️ No matching credential found in wallet.");
            }
        }

        res.status(200).json({ message: "✅ Webhook processed successfully!" });
    } catch (error) {
        console.error("❌ Error processing webhook:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

//UUID type shii
app.get('/generate-uuid', (req, res) => {
    const uuid = uuidv4();
    res.json({ uuid });
});

app.post('/api/saveUserCredentials', async (req, res) => {
    try {
        const { uuid, email } = req.body;
        await fetch("http://localhost:3000/api/databasesApi/dbCredon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                label: uuid,
                email: email,
            }),
        });

        console.log(`Saving UUID: ${uuid}, Email: ${email}`);

        res.status(200).json({ message: 'Credentials saved successfully' });
    } catch (error) {
        console.error('Error saving credentials:', error);
        res.status(500).json({ error: 'Failed to save credentials' });
    }
});

app.post('/api/updateUserCredentials', async (req, res) => {
    try {
        const { uuid } = req.body;
        const connections = await getConnections(ISSUER_URL);
        const getIssuerConnections = connections.filter((connection) => connection.their_label === uuid);
        const getIssuerConnectionId = getIssuerConnections[0].connection_id;

        const issueCredentialsRecord = await getIssueCredential(ISSUER_URL);
        const matchingRecord = issueCredentialsRecord.find(
            (c) => c.cred_ex_record.connection_id === getIssuerConnectionId
        );
        const getCredExchangeId = matchingRecord.cred_ex_record.cred_ex_id;

        await fetch("http://localhost:3000/api/databasesApi/dbCredon", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                label: uuid, 
                connectionId: getIssuerConnectionId,
                credExchangeId: getCredExchangeId,
            }),
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await deleteIssueCredential(ISSUER_URL, getCredExchangeId)
        res.status(200).json({ message: 'Credentials saved successfully' });
    } catch (error) {
        console.error('Error saving credentials:', error);
        res.status(500).json({ error: 'Failed to save credentials' });
    }
});

app.listen(4000, () => console.log('Server running on port 4000'));
