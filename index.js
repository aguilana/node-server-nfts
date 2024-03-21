const express = require('express');
const axios = require('axios');
const morgan = require('morgan');
const cors = require('cors');
const app = express();
const port = 8080;
const fs = require('fs');

//cors
app.use(cors());
//middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));


/**
 * @description
 * test route
 */
app.get('/:collectionSymbol', (req, res) => {

    // get query params
    const { collectionSymbol } = req.params;
    console.log('name:', collectionSymbol);

    res.send(`Hello world!! Collection symbol you selected is ${collectionSymbol}`);
})

/**
 * @description
 * Fetch all tokens from a collection
 * @param {String} collectionSymbol - the symbol of the collection i.e 'omb', 'quantum_cats', etc...
 */

app.get('/api/eden/:collectionSymbol', async (req, res) => {
    /**
     * get params from request
     * init variables for offset and limit
     * init empty array to store new tokens
     * init empty array to store all tokens
     */
    const { collectionSymbol } = req.params;
    let offset = 0;
    let limit = 100;
    let newTokens = [];
    let allTokens = [];
    try {

        /**
         * fetch data from api
         * loop through the data until there are no more tokens
         * process the data and store in newTokens array (reduced data to only the necessary fields)
         * store all tokens in allTokens array (all data from the api response)
         * write data to file to use for webapp
         */
        while (true) {
            const response = await axios.get(`https://api-mainnet.magiceden.dev/v2/ord/btc/tokens?limit=${limit}&offset=${offset}&sortBy=inscriptionNumberAsc&minPrice=0&maxPrice=0&collectionSymbol=${collectionSymbol}&disablePendingTransactions=false`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.EDEN_API_KEY}` // api key expires 03/28/2024
                }
            })
            const tokens = response.data.tokens;

            if (offset === 0 && tokens.length === 0) {
                return res.status(404).json({ error: `Collection symbol '${collectionSymbol}' not found.` });
            }

            // break the loop if there are no more tokens
            if (tokens.length === 0) break;

            // process the data and store in newTokens array
            const processedTokens = tokens.map(token => {
                return {
                    id: token.id,
                    inscriptionNumber: token.inscriptionNumber,
                    name: token.meta.name,
                    listed: token.listed ? token.listed : false,
                    listedAt: token.listedAt ? token.listedAt : null,
                    listedPrice: token.listedPrice ? token.listedPrice : null,
                    collectionSymbol: token.collectionSymbol,
                    imageUrl: token.meta.collection_page_img_url ? token.meta.collection_page_img_url : null
                }
            });
            allTokens = [...allTokens, ...tokens]
            newTokens = [...newTokens, ...processedTokens];

            // increment the offset to get the next set of tokens
            offset += limit;
        }

        const collectionTokens = {
            [collectionSymbol]: newTokens
        };
        const allDataInCollectionTokens = {
            [collectionSymbol]: allTokens
        };

        /**
         * write data to file to use for webapp
         * write all tokens to file
         * write collection tokens to file
         * send response to client - not needed but good to see the data
         */
        fs.writeFileSync(`${collectionSymbol}_all.json`, JSON.stringify(allDataInCollectionTokens));
        fs.writeFileSync(`${collectionSymbol}_prices.json`, JSON.stringify(collectionTokens));
        res.json(collectionTokens);

    } catch (error) {
        console.error('Error fetching data:', error.response ? error.response.data : error.message);
    }
});

/**
 * @description
 * Fetch all tokens from a collection using the collectionId - test route
 */
app.get('/api/:collectionId', async (req, res) => {
    const { collectionId } = req.params;
    try {
        const response = await axios.get(`https://api-mainnet.magiceden.dev/v2/ord/btc/tokens?limit=100&offset=0&sortBy=inscriptionNumberAsc&minPrice=0&maxPrice=0&collectionSymbol=${collectionId}&disablePendingTransactions=false`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.EDEN_API_KEY}` // api key expires 03/28/2024
            }
        })

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching data:', error.response ? error.response.data : error.message);
    }
})

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
