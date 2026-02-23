const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require('cors');
const cookieParser = require('cookie-parser');

const PORT = 8000;
app.use(bodyParser.json());
const allowedOrigins = ['http://localhost:3000'];

app.use(cors({
    origin: function(origin, callback){
        if(!origin || allowedOrigins.includes(origin)){
            callback(null, true)
        } else {
            callback(new Error('Origin not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(cookieParser());

app.get('/work', (req, res) => {
    res.send({message: 'The Api is working!'});
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});