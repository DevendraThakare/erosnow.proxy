const http = require('http')
const request = require('request')
const OAuth = require('oauth-1.0a')
const crypto = require('crypto')
const config = require('./config')
var Cookies = require('cookies')

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
// TODO: use proper env
const debug = process.env.NODE_ENV !== 'production'

const onRequest = (clientRequest, clientResponse) => {
    console.log(`serving: ${clientRequest.method} + ${clientRequest.url}`)
    // intercept OPTIONS method
    if (clientRequest.method == 'OPTIONS') {
        setCorsHeaders(clientRequest, clientResponse)
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

// const keys = ['eros proxy service']

const forwardRequest = (clientRequest, clientResponse) => {
    const requestUrl = `${config.apiBaseUrl}${clientRequest.url}`
    const cookies = new Cookies(clientRequest, clientResponse)
    const requestData = {
        url: requestUrl,
        method: clientRequest.method
    }
    if (clientRequest.body) {
        const body = JSON.parse(clientRequest.body)
        requestData.data = body
    }
    let token
    const tokenKey = cookies.get('token_key')
    const tokenSecrete = cookies.get('token_secret')
    if (tokenKey && tokenSecrete) {
        token = {
            key: tokenKey,
            secret: tokenSecrete
        }
    }
    const requestOptions = {
        url: requestData.url,
        method: requestData.method,
        form: requestData.data,
        headers: token
            ? oauth.toHeader(oauth.authorize(requestData, token))
            : oauth.toHeader(oauth.authorize(requestData))
    }

    const apiReq = request(requestOptions).on('error', function(e) {
        clientResponse.end(e)
    })
    // .on('response', function(apiResp) {
    //     setCorsHeaders(clientRequest, apiResp)
    // })
    apiReq.pipefilter = (response, dest) => {
        setCorsHeaders(clientRequest, dest)
    }
    apiReq.pipe(clientResponse)
}

const setCorsHeaders = (clientRequest, clientResponse) => {
    let allowedOrigins = ['https://erosnow.com', 'https://stg.erosnow.com']
    const localOrigins = [
        'http://localhost:8080',
        'http://localhost:8081',
        'http://localhost:4000',
        'http://localhost:3000'
    ]
    if (debug) {
        allowedOrigins = allowedOrigins.concat(localOrigins)
    }
    const origin = clientRequest.headers.origin
    if (allowedOrigins.indexOf(origin) > -1) {
        clientResponse.setHeader('Access-Control-Allow-Origin', origin)
    }
    // clientResponse.setHeader('Access-Control-Allow-Origin', '*')
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
}

const port = process.env.PORT || 4000
http.createServer(onRequest).listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`server started at localhost:${port}`)
})
