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
    'priority': 'u=1, i',
    'referer': 'https://seekingalpha.com/latest-articles',
    'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
    'cookie': process.env.COOKIE,
};

function dateToTimestamp(dateString) {
    return Math.floor(new Date(dateString).getTime() / 1000);
}

const FILTER_SINCE = dateToTimestamp(process.env.FILTER_SINCE);
const FILTER_UNTIL = dateToTimestamp(process.env.FILTER_UNTIL);

async function fetchArticles(filterSince, filterUntil) {
    try {
        const response = await axios.get('https://seekingalpha.com/api/v3/articles', {
            headers: HEADERS,
            params: {
                'fields[article]': 'structuredInsights,publishOn,author,commentCount,title,primaryTickers,secondaryTickers,summary,isRead,sentiments',
                'filter[category]': CATEGORY,
                'filter[since]': 0,
                'filter[until]': filterUntil,
                'include': 'author,primaryTickers,secondaryTickers,sentiments',
                'isMounting': true,
                'page[size]': 20,
                'page[number]': 1,
            },
        });

        return response.data;
    } catch (error) {
        console.error(`Error fetching data ${filterSince}~${filterUntil}:`, error.message);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Headers: ${JSON.stringify(error.response.headers)}`);
            console.error(`Data: ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Request error:', error.message);
        }
        return null;
    }
}

function getEarliestFile() {
    ;
    if (!fs.existsSync(OUTPUT_DIR)) {
        return null;
    }

    // Sort in ascending order
    const files = fs.readdirSync(OUTPUT_DIR).sort((a, b) => a - b);

    return files.length > 0 ? files[0] : null;
}

async function saveToFile(filterSince, data) {
    try {
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        const filePath = path.join(OUTPUT_DIR, `category-${filterSince}.json`);

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Saved page ${filterSince} to ${filePath}`);
    } catch (error) {
        console.error(`Error saving page ${filterSince}:`, error.message);
    }
}

async function fetchAllData() {
    const filterSince = dateToTimestamp(process.env.FILTER_SINCE);
    let filterUntil = dateToTimestamp(process.env.FILTER_UNTIL);

    let earliestFile = getEarliestFile();
    if (earliestFile) {
        let data = require(path.join(OUTPUT_DIR, earliestFile));

        filterUntil = data.meta.page.minmaxPublishOn.min;
        console.log(`Update filterUntil from files ${filterUntil}`);
    }

    while (true) {
        console.log(`Fetching data earlier than ${filterUntil}...`);

        const data = await fetchArticles(filterSince, filterUntil);

        if (!data || !data.data || data.data.length === 0) {
            console.log(`No more data found. Stopping fetch.`);
            break;
        }

        await saveToFile(filterUntil, data);

        // Update filterSince with the publish time of the last article
        if (
            data.meta &&
            data.meta.page &&
            data.meta.page.minmaxPublishOn &&
            data.meta.page.minmaxPublishOn.min
        ) {
            filterUntil = data.meta.page.minmaxPublishOn.min;
        } else {
            console.error('Unable to retrieve publishOn timestamp from last article, stopping fetch.');
            break;
        }

        if (filterUntil < filterSince) {
            console.error('filterUntil less than filterSince, break');
            break;
        }

        // Random sleep between 0 to 8 seconds
        const sleepTime = Math.floor(Math.random() * (8000 + 1));
        console.log(`Sleeping for ${sleepTime / 1000} seconds...`);
        await sleep(sleepTime);
    }
}


fetchAllData().then(() => console.log('Finished fetching all articles.'));
