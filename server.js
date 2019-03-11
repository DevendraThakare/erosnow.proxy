const http = require('http')
const request = require('request')
const url = require('url')
const OAuth = require('oauth-1.0a')
const crypto = require('crypto')
const config = require('./config')

const oauth = OAuth({
    consumer: {
        key: config.consumerKey,
        secret: config.consumerSecret
    },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString, key) {
        return crypto
            .createHmac('sha1', key)
            .update(baseString)
            .digest('base64')
    }
})

const onRequest = (clientRequest, clientResponse) => {
    clientResponse.setHeader('Access-Control-Allow-Origin', '*')
    clientResponse.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, OPTIONS, PUT, PATCH, DELETE'
    ) // If needed
    clientResponse.setHeader(
        'Access-Control-Allow-Headers',
        'X-Requested-With,content-type'
    ) // If needed
    clientResponse.setHeader('Access-Control-Allow-Credentials', true) // If needed

    // intercept OPTIONS method
    if (clientRequest.method == 'OPTIONS') {
        clientResponse.statusCode = 200
        clientResponse.end()
    } else {
        console.log('serve: ' + clientRequest.url)
        const address = url.parse(clientRequest.url, true)
        // const queryString = address.query
        const requestUrl = `${config.apiBaseUrl}${clientRequest.url}`
        const requestData = {
            url: requestUrl,
            method: clientRequest.method
            // qs: queryString
        }
        request({
            ...requestData,
            // headers: oauth.toHeader(oauth.authorize(requestData, token))
            headers: oauth.toHeader(oauth.authorize(requestData))
        })
            .on('error', function(e) {
                clientResponse.end(e)
            })
            .pipe(clientResponse)
    }
}
const port = process.env.PORT || 4000
http.createServer(onRequest).listen(port)
