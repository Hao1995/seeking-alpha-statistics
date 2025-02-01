const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { promisify } = require('util');
const sleep = promisify(setTimeout);
require('dotenv').config();

const CATEGORY = 'latest-articles';
const OUTPUT_DIR = path.join(__dirname, 'data', CATEGORY);
const HEADERS = {
    'accept': 'application/json',
    'accept-language': 'en-US,en;q=0.9,zh-TW;q=0.8,zh;q=0.7',
    'cookie': process.env.COOKIE,
    'priority': 'u=1, i',
    'referer': 'https://seekingalpha.com/ai-tech-stocks',
    'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
};

function dateToTimestamp(dateString) {
    return Math.floor(new Date(dateString).getTime() / 1000);
}

const FILTER_SINCE = dateToTimestamp(process.env.FILTER_SINCE);
const FILTER_UNTIL = dateToTimestamp(process.env.FILTER_UNTIL);

async function fetchPage(filterSince, filterUntil, pageSize, pageNumber) {
    try {
        const response = await axios.get('https://seekingalpha.com/api/v3/articles', {
            headers: HEADERS,
            params: {
                'fields[article]': 'structuredInsights,publishOn,author,commentCount,title,primaryTickers,secondaryTickers,summary,isRead,sentiments',
                'filter[category]': CATEGORY,
                'filter[since]': filterSince,
                'filter[until]': filterUntil,
                'include': 'author,primaryTickers,secondaryTickers,sentiments',
                'isMounting': true,
                'page[size]': pageSize,
                'page[number]': pageNumber,
            },
        });

        return response.data;
    } catch (error) {
        console.error(`Error fetching page ${pageNumber}:`, error.message);
        return null;
    }
}

async function saveToFile(pageNumber, data) {
    try {
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }
        
        const paddedPageNumber = pageNumber.toString().padStart(4, '0');
        const filePath = path.join(OUTPUT_DIR, `category-${paddedPageNumber}.json`);
        
        if (fs.existsSync(filePath)) {
            console.log(`File already exists for page ${paddedPageNumber}, skipping...`);
            return;
        }
        
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Saved page ${paddedPageNumber} to ${filePath}`);
    } catch (error) {
        console.error(`Error saving page ${pageNumber}:`, error.message);
    }
}

async function fetchAllPages() {
    const PAGE_SIZE = 20;

    let page = 1;
    let totalPages = Infinity;

    while (page <= totalPages) {
        const paddedPageNumber = page.toString().padStart(4, '0');
        const filePath = path.join(OUTPUT_DIR, `category-${paddedPageNumber}.json`);
        
        if (!fs.existsSync(filePath)) {
            console.log(`Fetching page ${page}...`);
            const data = await fetchPage(FILTER_SINCE, FILTER_UNTIL, PAGE_SIZE, page);
            
            if (!data || !data.data || data.data.length === 0) {
                console.log(`No more data found. Stopping at page ${page}.`);
                break;
            }
            
            await saveToFile(page, data);
    
            if (data.meta && data.meta.page && data.meta.page.totalPages) {
                totalPages = data.meta.page.totalPages;
            } else {
                throw new Error('Unable to retrieve totalPages from response meta data');
            }
    
            // Random sleep between 0 to 20 seconds
            const sleepTime = Math.floor(Math.random() * (20000 + 1));
            console.log(`Sleeping for ${sleepTime / 1000} seconds...`);
            await sleep(sleepTime);
        }

        page++;
    }
}

fetchAllPages().then(() => console.log('Finished fetching all pages.'));
