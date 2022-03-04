import fetch from 'node-fetch';
import { writeFileSync } from 'fs';

// Config
const server_url = 'http://localhost:3000';
const credentials = {
    login: 'BankinUser',
    password: '12345678',
    clientId: 'BankinClientId',
    clientSecret: 'secret'
};

// Main
async function main () {
    // 1. Authenticate to the API to retrieve an access token

    // Get a refresh token
    const refresh_response = await fetch(`${server_url}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64')}`
        },
        body: JSON.stringify({
            user: credentials.login,
            password: credentials.password,
        })
    });

    // Error handler
    if (refresh_response.status !== 200) {
        if (refresh_response.status === 401) {
            console.error('Invalid credentials');
        } else if (refresh_response.status === 400) {
            console.error('Something get wrong with the request');
        } else {
            console.error(`Unknown error: ${refresh_response.status}`);
        }
        return;
    }

    // Refresh token parsing
    const { refresh_token } = await refresh_response.json();

    // Get access token
    const access_response = await fetch(`${server_url}/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=refresh_token&refresh_token=${refresh_token}`
    });

    // Error handler
    if (access_response.status !== 200) {
        if (access_response.status === 401) {
            console.error('Refresh token is invalid');
        } else if (access_response.status === 400) {
            console.error('Something get wrong with the request');
        } else {
            console.error(`Unknown error: ${access_response.status}`);
        }
        return;
    }

    // Access token parsing
    const { access_token } = await access_response.json();

    // 2. Retrieve the accounts & transactions lists

    // Get all user's accounts
    // Note : Only 3 pages in server data but go to page 22 with api
    let all_accounts = [];
    let accounts;
    let pageCount = 1;
    
    do {
        const accounts_response = await fetch(`${server_url}/accounts?page=${pageCount}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            }
        });
    
        // Error handler
        if (accounts_response.status !== 200) {
            if (accounts_response.status === 401) {
                console.error('Access token is invalid');
            } else {
                console.error(`Unknown error: ${accounts_response.status}`);
            }
        }
    
        // Accounts parsing
        accounts = await accounts_response.json();
        all_accounts.push(...accounts.account);
        pageCount++;
    } while (accounts.link.next !== null);

    // Remove duplicate accounts
    all_accounts = all_accounts.filter((account, index, self) =>
        index === self.findIndex((t) => (
            t.acc_number === account.acc_number
        ))
    );

    // Get all user's transactions
    // Note : Account '0000000013' exist but API return 'Account not found'
    for (let i = 0; i < all_accounts.length; i++) {
        let transactions;
        pageCount = 1;
        all_accounts[i].transactions = [];
        do {
            const transactions_response = await fetch(`${server_url}/accounts/${all_accounts[i].acc_number}/transactions?page=${pageCount}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${access_token}`
                }
            });
    
            // Error handler
            if (transactions_response.status !== 200) {
                if (transactions_response.status === 401) {
                    console.error('Access token is invalid');
                } else if (transactions_response.status === 400 && (await transactions_response.text()) === 'Account not found') {
                    console.log(`Account not found with transactions API : ${all_accounts[i].acc_number}`);
                    transactions = {
                        transactions: [],
                        link: {
                            next: null
                        }
                    };
                    continue;
                } else {
                    console.error(`Unknown error: ${transactions_response.status}`);
                }
            }
    
            // Transactions parsing
            transactions = await transactions_response.json();
            all_accounts[i].transactions.push(...transactions.transactions);
            pageCount++;
        } while (transactions.link.next !== null);

        // Remove duplicate transactions
        all_accounts[i].transactions = all_accounts[i].transactions.filter((transaction, index, self) =>
            index === self.findIndex((t) => (
                t.id === transaction.id
            ))
        );
    }

    // 3. Parse the accounts with the format provided
    const result = [];
    for (let i = 0; i < all_accounts.length; i++) {
        result.push({
            acc_number: all_accounts[i].acc_number,
            amount: all_accounts[i].amount,
            transactions: all_accounts[i].transactions.map(transaction => ({
                label: transaction.label,
                amount: transaction.amount,
                currency: transaction.currency,
            }))
        });
    }

    // Write in a json file
    writeFileSync('result.json', JSON.stringify(result, null, 2));
    console.log('Result written in result.json');
}

main();
