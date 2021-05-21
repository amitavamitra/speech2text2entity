'use strict';

//  Google Cloud Speech Playground with node.js and socket.io
//  Created by Vinzenz Aubry for sansho 24.01.17
//  Feel free to improve!
//	Contact: vinzenz@sansho.studio

const express = require('express'); // const bodyParser = require('body-parser'); // const path = require('path');
const environmentVars = require('dotenv').config();

// Google Cloud
const speech = require('@google-cloud/speech');
const speechClient = new speech.SpeechClient(); // Creates a client

const app = express();
const port = process.env.PORT || 3000;
const server = require('http').createServer(app);

const io = require('socket.io')(server);

// app.use('/assets', express.static(__dirname + '/public'));
// app.use('/session/assets', express.static(__dirname + '/public'));
app.set('view engine', 'ejs');

// ===========================Text2Entity===============================//
// import npm packages
// const express = require('express');
// const ejs = require('ejs');
const bodyParser = require('body-parser');
// const app = express();
const https = require('https');
const requestpkg = require('request');
const rfcClient = require("node-rfc").Client; 
// require('dotenv').config();

//  define the app on express middleware
//  we set public to be our static resources 
//  folder for the project
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:true}));
// we use ejs as rendering engine
// for this package we need a views folder 
// we define all ui/html pages in this folder
// app.set('view engine' , 'ejs');
// we define constants for the project
// this file should be part of .env 
// and part of .gitignore
// credential for ai core instance
const service_key = require('./enablement-sk.json');
// const { request } = require('node:http');
const { func } = require('assert-plus');
// clientID acts as username in requests 
const clientId = service_key['clientid'];
//  secretkey acts as password
const secretkey = service_key['clientsecret'];
// base_url to ai instance
const base_url = service_key['serviceurls']['ML_API_URL'] + '/v2' ;
// url to be used to fetch the auth token
var url = service_key['url'] + '/oauth/token?grant_type=client_credentials' ;
// global definition of token variable
var token = "";
//  global definition of serving url for inference
var serving = "";
var alive = "Please log in!";
// get onto the logon page renders the home page
var yourArray = [];
var ent = "";
var val = "";
var text = "";
var entity = [];
var value = [];
var textforEntity = "";
app.get('/login', function(req,res){
  res.render('login');
})
app.get('/', function(req,res){
  res.render('index',{alive:alive , entity:entity,value:value , text:text});
})
entity =[];
value = [];
// 1. Function - get JwT token. Button Login press.
//  done through a post route.
// called from Login button in a  form in home.ejs post action .
app.post('/login' , function(req,res){
// use Basic Auth  with clientID and secretkey to base64.
// we use this to auth in the header to fetch the token 
// along with the url prepared earlier.
              var auth = "Basic " + new Buffer(clientId + ":" + secretkey).toString("base64");
              requestpkg.get( {
                url : url,
                headers : {
                    "Authorization" : auth
                }
              }, function(error, response, body) {
                  token = JSON.parse(body)['access_token'];
                  console.log(token);
                //    JWT token 
                if (token !== '') {
                   alive = 'You are in'
                  console.log(alive)
                }
              });
                res.redirect('/');
                // Create headers  with AI Resource Group and Bearer token
  });
// Check the deployment is running - before inference
app.post('/serve', function(req,res){
    var headers = {'AI-Resource-Group': 'default','Authorization': 'Bearer '+ token}
    console.log(headers);
    const serve  = base_url + '/lm/deployments/'+ req.body.deploymentID;
    console.log(serve);
    requestpkg.get( {
        url : serve,
        headers : headers,
      }, function(error, response, body) {
        console.log('***********************deployment*************************');
          console.log('body : ', JSON.parse(body));
         serving = JSON.parse(body)['deploymentUrl'];
        //   Serving
        console.log('**************************************************************');
        console.log(serving);
        console.log('**************************************************************');
      });
 });

// Infer on Text data
app.post('/infer', function(req,res,next){
  var headers = {'AI-Resource-Group': 'default','Authorization': 'Bearer '+ token}
  var inference = serving + "/v1/models/model:predict";
  console.log('******************Infererence Url*************************');
  console.log(inference);
  console.log('******************Infererence Url*************************');
        text = req.body.transcript;
        var inputs = {
          "text": text,
          }
          console.log(inputs);  
          requestpkg.post({
          url: inference,
          headers: headers,
          json: inputs,
            }, function(err, res) {
              if(err) {
                console.error(err);
              } else {
                yourArray = res.body;
                console.log('******************Your Array *************************');
                console.log(yourArray);
                console.log('******************Your Array *************************');
                for (let index = 0; index < yourArray.length; index++) {
                  const element = yourArray[index];
                  var eleString = JSON.stringify(element)
                  // console.log('Entities')
                  ent = eleString.substr(2, eleString.indexOf('":')-2 )
                  entity.push(ent);
                  val = eleString.substr(eleString.indexOf('":') + 3, eleString.indexOf("}"))
                  val = val.substring(0, val.length - 2);
                  value.push(val);
                  }
                } 
                   
        });
        res.redirect('/');  
        next();   
});

// On user approval - call S/4 via node-rfc

app.post('/s4api' , function(req,res){
console.log('called post method')
  
const abapConnection = {
  dest:'S4H',
  user:process.env.USER,
  passwd:process.env.PASSWORD,
  ashost: process.env.AHOST,
  sysnr: "00",
  client: "100",
      };
     // create new client
  const client = new rfcClient(abapConnection);
  //  check material description
console.log(entity)
  for (let index = 0; index < entity.length; index++) {
    // const element = entity[index];
    if (entity[index] == 'MATKX') {
      var matkx = value[index]
      console.log(matkx)
    }
  }
  // echo SAP NW RFC SDK and nodejs/RFC binding version
  console.log("Client version: ", client.version);
  
  // open connection
  client.connect(function(err) {
    
    if (err) {
      return console.error("could not connect to server",err);
    } else {
      console.log('Logged on to System:' + abapConnection.dest + " client " +abapConnection.client)
    }
var timest = new Date().getUTCMinutes();
 
  //   // invoke ABAP function module, passing structure and table parameters
       
      const headdata = {
      MATERIAL        :       'text2ent' + timest,
      IND_SECTOR      :       "M",
      MATL_TYPE       :       "HALB",
      BASIC_VIEW      :       "X",
      MATERIAL_LONG   :      'text2ent' + timest
          };
  const clientdata  = {
      OLD_MAT_NO     :   matkx,
      BASE_UOM       :    "EA",
      MATL_GROUP     :    "01"  
      };
  const clientdatax  = {
      OLD_MAT_NO     :    "X",
      BASE_UOM       :    "X" ,
      MATL_GROUP     :    "X"    
      };
  
  const    MATERIALDESCRIPTION = [{
  
      LANGU        :         "EN",
      LANGU_ISO    :          "EN",
      MATL_DESC    :        matkx
  
  }];
  
          client.invoke(
          "BAPI_MATERIAL_SAVEDATA",
          { HEADDATA: headdata ,
            CLIENTDATA: clientdata,
            CLIENTDATAX:clientdatax,
            MATERIALDESCRIPTION: MATERIALDESCRIPTION
           },
          function(err, res) {
              if (err) {
                  return console.error("Error invoking STFC_STRUCTURE:", err);
              }
              console.log("BAPI_MATERIAL_SAVEDATA call result:", res);
          }
      ); 
  });  // Dont comment this one..

})


// =========================== ROUTERS ================================ //

// app.get('/', function (req, res) {
//   res.render('index', {});
// });

app.use('/', function (req, res, next) {
  next(); // console.log(`Request Url: ${req.url}`);
});


// =========================== SOCKET.IO ================================ //

io.on('connection', function (client) {
  console.log('Client Connected to server');
  let recognizeStream = null;

  client.on('join', function () {
    client.emit('messages', 'Socket Connected to Server');
  });

  client.on('messages', function (data) {
    client.emit('broad', data);
    
  });

  client.on('text', function (data) {
    text = data;
  });


  client.on('startGoogleCloudStream', function (data) {
    startRecognitionStream(this, data);
  });

  client.on('endGoogleCloudStream', function () {
    stopRecognitionStream();
  });

  client.on('binaryData', function (data) {
    // console.log(data); //log binary data
    if (recognizeStream !== null) {
      recognizeStream.write(data);
    }
  });

  function startRecognitionStream(client) {
    recognizeStream = speechClient
      .streamingRecognize(request)
      .on('error', console.error)
      .on('data', (data) => {
        process.stdout.write(data.results[0] && data.results[0].alternatives[0] ? `Transcription: ${data.results[0].alternatives[0].transcript}\n` : '\n\nReached transcription time limit, press Ctrl+C\n');
        client.emit('speechData', data);

        // if end of utterance, let's restart stream
        // this is a small hack. After 65 seconds of silence, the stream will still throw an error for speech length limit
        if (data.results[0] && data.results[0].isFinal) {
          stopRecognitionStream();
          startRecognitionStream(client);
          // console.log('restarted stream serverside');
        }
      });
  }
  function stopRecognitionStream() {
    if (recognizeStream) {
      recognizeStream.end();
    }
    recognizeStream = null;
  }
});

// =========================== GOOGLE CLOUD SETTINGS ================================ //

// The encoding of the audio file, e.g. 'LINEAR16'
// The sample rate of the audio file in hertz, e.g. 16000
// The BCP-47 language code to use, e.g. 'en-US'
const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
const languageCode = 'en-US'; //en-US

const request = {
  config: {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
    profanityFilter: false,
    enableWordTimeOffsets: true,
    // speechContexts: [{
    //     phrases: ["hoful","shwazil"]
    //    }] // add your own speech context for better recognition
  },
  interimResults: true, // If you want interim results, set this to true
};

// =========================== START SERVER ================================ //

server.listen(port, '127.0.0.1', function () {
  //http listen, to make socket work
  // app.address = "127.0.0.1";
  console.log('Server started on port:' + port);
});
