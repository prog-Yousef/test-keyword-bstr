import { google } from 'googleapis';
import { db } from './firebaseConfig.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Få den korrekta sökvägen
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const keyFilePath = path.join(__dirname, '..', '.config', 'service-account-key.json')

console.log('Försöker läsa credentials från:', keyFilePath); // För debugging

const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/documents'],
});



const docs = google.docs({ version: 'v1', auth });

async function writeKeywordsToDoc(documentId) {
    try {
        const keywordsSnapshot = await db.collection('keywords')
            .orderBy('createdAt', 'desc')
            .get();

        let content = 'Extraherade Keywords:\n\n';
        keywordsSnapshot.forEach(doc => {
            const data = doc.data();
            content += `Original Text: ${data.text}\n`;
            content += `Keywords: ${data.keywords}\n`;
            content += `Datum: ${data.createdAt.toDate().toLocaleString()}\n\n`;
        });

        const request = {
            documentId: documentId,
            requestBody: {
                requests: [
                    {
                        insertText: {
                            location: {
                                index: 1,
                            },
                            text: content,
                        },
                    },
                ],
            },
        };

        await docs.documents.batchUpdate(request);
        console.log('Keywords har skrivits till dokumentet');
        return true;
    } catch (error) {
        console.error('Fel vid skrivning till Google Docs:', error);
        throw error;
    }
}

export function addGoogleDocsEndpoint(app) {
    app.post('/write-to-docs', async (req, res) => {
        const { documentId } = req.body;
        
        if (!documentId) {
            return res.status(400).json({ error: 'Document ID krävs' });
        }

        try {
            await writeKeywordsToDoc(documentId);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}