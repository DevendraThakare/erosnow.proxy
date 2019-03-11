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

// TODO: Remove HardCoded token
// const token = {
//     key: '0d5e96040fd071a6282a44be1ad0c7ec05c6d30c6',
//     secret: '6dea50d55bef78fe5f66bb19f578cfc4'
// }

const onRequest = (clientRequest, clientResponse) => {
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
        // qs: queryString,
        // headers: {
        //     // ...clientRequest.headers,
        //     Authorization: oauth.toHeader(oauth.authorize(requestData, token))
        //         .Authorization
        // }
    })
        .on('error', function(e) {
            clientResponse.end(e)
        })
        .pipe(clientResponse)
}
const port = process.env.PORT || 4000
http.createServer(onRequest).listen(port)
