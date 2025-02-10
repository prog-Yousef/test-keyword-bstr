
// server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { removeStopwords } from 'stopword';

dotenv.config();

const API_USERNAME = process.env.API_USERNAME;
const API_PASSWORD = process.env.API_PASSWORD;

if (!API_USERNAME || !API_PASSWORD) {
    console.error('API_USERNAME and API_PASSWORD must be set in .env file');
    process.exit(1);
}


const app = express();
app.use(cors());
app.use(express.json());
const PORT = 5000;



// Svenska stoppord
const swedishStopwords = [
    'och', 'det', 'att', 'i', 'en', 'jag', 'hon', 'som', 'han', 'på', 
    'den', 'med', 'var', 'sig', 'för', 'så', 'till', 'är', 'men', 'ett', 
    'om', 'hade', 'de', 'av', 'icke', 'mig', 'du', 'henne', 'då', 'sin', 
    'nu', 'har', 'inte', 'hans', 'honom', 'skulle', 'hennes', 'där', 'min', 
    'man', 'ej', 'vid', 'kunde', 'något', 'från', 'ut', 'när', 'efter', 'upp', 
    'vi', 'dem', 'vara', 'vad', 'över', 'än', 'dig', 'kan', 'sina', 'här',
    'ha', 'mot', 'alla', 'under', 'någon', 'eller', 'allt', 'mycket', 'sedan',
    'ju', 'denna', 'själv', 'detta', 'åt', 'utan', 'varit', 'hur', 'ingen',
    'mitt', 'ni', 'bli', 'blev', 'oss', 'din', 'dessa', 'några', 'deras',
    'blir', 'mina', 'samma', 'vilken', 'er', 'sådan', 'vår', 'blivit',
    'dess', 'inom', 'mellan', 'sådant', 'varför', 'varje', 'vilka', 'ditt',
    'vem', 'vilket', 'sitta', 'sådana', 'vart', 'dina', 'vars', 'vårt',
    'våra', 'ert', 'era', 'vilkas', 'samt', 'också', 'ska', 'mer', 'får',
    'får', 'bör', 'enligt', 'hos', 'där', 'därför', 'dock', 'set', 'blev',
    'bli', 'blev', 'bland', 'mer', 'mindre', 'mest', 'minst', 'annat', 'andra',
    'tredje', 'fjärde', 'femte', 'dig', 'din', 'ditt', 'där', 'därför',
    'söker', 'olika', 'enligt', 'ser', 'ses', 'ett', 'två', 'tre', 'fyra', 'fem',
    'and','the','vill','både','del','kommer','you','strong','även','god'
];

// Lista över tekniska termer att filtrera bort
const technicalTerms = [
    'gigleer',
    'afjt',
    'pau',
    'acr',
    'ngn',
    'id',
    'pp',
    'api',
    'json',
    'xml',
    'html',
    'url',
    'http',
    'https',
    'www'
];

// Funktion för att rensa text
function cleanText(text) {
    return text.toLowerCase()
        .replace(/[^\w\såäöÅÄÖ]/g, ' ')  // Behåll bara bokstäver, siffror och svenska tecken
        .replace(/\s+/g, ' ')            // Normalisera mellanslag
        .trim();
}

// Funktion för att kontrollera om ett ord är giltigt
function isValidWord(word) {
    if (word.length < 3) return false;                    // För korta ord
    if (!word.match(/[a-zåäöÅÄÖ]/)) return false;        // Måste innehålla bokstäver
    if (word.match(/^\d+$/)) return false;               // Rena siffror
    if (word.includes('_')) return false;                // Tekniska termer med understräck
    if (word.match(/\d{4}/)) return false;               // Årtal och datum
    
    if (technicalTerms.includes(word.toLowerCase())) return false;
    
    return true;
}

// Funktion för att analysera jobbannonser och räkna nyckelord
function analyzeJobDescriptions(jsonData) {
    const globalKeywordFrequency = {};
    let totalProcessedJobs = 0;

    // Gå igenom varje jobbannons
    jsonData.hits.hits.forEach(hit => {
        if (hit._source?.document?.description?.text) {
            const description = hit._source.document.description.text;
            totalProcessedJobs++;
            
            // Analysera texten
            const cleanedText = cleanText(description);
            const words = cleanedText.split(' ');
            const validWords = words.filter(isValidWord);
            const nonStopWords = removeStopwords(validWords, swedishStopwords);

            // Räkna frekvensen av varje ord
            nonStopWords.forEach(word => {
                word = word.toLowerCase();
                globalKeywordFrequency[word] = (globalKeywordFrequency[word] || 0) + 1;
            });
        }
    });

    // Sortera och hämta top 10 nyckelord
    const sortedKeywords = Object.entries(globalKeywordFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word, count]) => ({
            word,
            occurrences: count,
            averagePerJob: (count / totalProcessedJobs).toFixed(2)
        }));

    return {
        totalProcessedJobs,
        topKeywords: sortedKeywords
    };
}

// API endpoint för analys från URL
app.post('/keywords-from-url', async (req, res) => {
    const { url, method = 'POST' } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        // Använd de fördefinierade inloggningsuppgifterna
        const credentials = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
        
        const fetchOptions = {
            method: method,
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };

        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const jsonData = await response.json();
        const analysis = analyzeJobDescriptions(jsonData);
        
        res.json({
            totalJobsAnalyzed: analysis.totalProcessedJobs,
            keywordAnalysis: {
                title: "Top 10 mest använda nyckelorden",
                topKeywords: analysis.topKeywords
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: 'Failed to process content',
            details: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});