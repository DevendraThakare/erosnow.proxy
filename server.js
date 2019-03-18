const http = require('http')
const request = require('request')
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
    console.log(`serving: ${clientRequest.method} + ${clientRequest.url}`)
    clientResponse.setHeader('Access-Control-Allow-Origin', '*')
    clientResponse.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, OPTIONS'
    )
    // If needed
    clientResponse.setHeader(
        'Access-Control-Allow-Headers',
        'X-Requested-With,content-type'
    )
    // If needed
    clientResponse.setHeader('Access-Control-Allow-Credentials', true)

    // intercept OPTIONS method
    if (clientRequest.method == 'OPTIONS') {
        clientResponse.statusCode = 200
        clientResponse.end()
    } else {
        if (clientRequest.method === 'POST' || clientRequest.method === 'PUT') {
            clientRequest.body = ''

            clientRequest.addListener('data', function(chunk) {
                clientRequest.body += chunk
            })

            clientRequest.addListener('end', function() {
                forwardRequest(clientRequest, clientResponse)
            })
        } else {
            forwardRequest(clientRequest, clientResponse)
        }
    }
}

const forwardRequest = (clientRequest, clientResponse) => {
    const requestUrl = `${config.apiBaseUrl}${clientRequest.url}`
    const requestData = {
        url: requestUrl,
        method: clientRequest.method
    }
    const requestOptions = {
        ...requestData,
        // headers: oauth.toHeader(oauth.authorize(requestData, token))
        headers: oauth.toHeader(oauth.authorize(requestData))
    }
    if(clientRequest.body){
        requestOptions.form = JSON.parse(clientRequest.body)
    }
    request(requestOptions)
        .on('error', function(e) {
            clientResponse.end(e)
        })
        .pipe(clientResponse)
}

const port = process.env.PORT || 4000
http.createServer(onRequest).listen(port)
