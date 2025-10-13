const nodemailer = require('nodemailer');
const express = require('express');
const app = express();
const multer = require('multer')
const ejs = require('ejs');
const bodyParser = require('body-parser')
const port = 5008;

app.use(bodyParser.urlencoded({
    extended:true
}))

app.use(bodyParser.json());

var Storage = multer.diskStorage({
    destination:function (req,file, callback){
        callback(null,'./email-templates')
    },
    filename:function (req,file,callback) {
        callback(null,file.fieldname + "_" + Date.now() + "_" + file.originalname)
    }
})

var upload = multer({
    storage: Storage
}).single('image');

app.use(express.static('public'));

app.get('/', (req,res) => {
    res.sendFile('./index.html');
})

app.post('/sendemail', (req,res,) =>{


    upload(req,res, function (err) {
        if(err){
            console.log(err);
            return res.end("Something Went Wrong");
        }
        else{
            const sendEmail = (reciever, subject, content) => {
                ejs.renderFile(__dirname + '/templates/welcome.ejs', {
                        reciever, subject, content
                    },
                    (err, data) => {
                        if (err) {
                            console.log(err);
                        } else {
                            var to;
                            var subject;
                            var body;
                            var path;

                            to = req.body.to
                            subject = req.body.subject
                            body = req.body.body
                            path = req.file.path

                            console.log("Email was sent to:- " + to)
                            console.log("Email Was Related with:-" + subject)
                            console.log("The content of the e-mail is:" + body)
                            console.log(path)

                            var transporter = nodemailer.createTransport({
                                host: 'smtp.gmail.com',
                                port: 587,
                                secure: false,
                                auth: {
                                    user: 'sayakmallickkv@gmail.com',
                                    pass: 'drlkspzjwmgauund',
                                }
                            })

                            var mailOptions = {
                                from: 'sayakmallickkv@gmail.com',
                                to: to,
                                subject: subject,
                                text:body,
                                html: data,
                                attachment: [
                                    {
                                        path: path
                                    }
                                ]
                            }

                            transporter.sendMail(mailOptions, function (err, info) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    console.log("Email Sent Successfully " + info.response)
                                    return res.redirect('/result.html');
                                }
                            })
                        }
                    })
        }
            var to;
            var subject;
           // var body;
            to = req.body.to
            subject = req.body.subject
            //body = req.body.body
            sendEmail(
                to,
                subject,
                //body
                "Novac Technology Solutions wishes you and your family a very happy halloween. Hope your day is full of good times and good treats."
            );
    }});
})


app.listen(port, () => {
    console.log(`🚀 Server is running at: http://localhost:${port}`);
})