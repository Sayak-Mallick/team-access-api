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

// Configure multer for bulk emails (attachment is optional)
var bulkUpload = multer({
    storage: Storage
}).single('image');

app.use(express.static('public'));

// Store active SSE connections
const sseConnections = new Map();

// SSE endpoint for real-time progress updates
app.get('/progress/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;

    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    // Store this connection
    sseConnections.set(sessionId, res);

    // Send initial connection message
    res.write('data: {"type": "connected", "message": "Connection established"}\n\n');

    // Clean up on connection close
    req.on('close', () => {
        sseConnections.delete(sessionId);
    });
});

// Helper function to send SSE updates
const sendSSEUpdate = (sessionId, data) => {
    const connection = sseConnections.get(sessionId);
    if (connection) {
        connection.write(`data: ${JSON.stringify(data)}\n\n`);
    }
};

// Helper function to create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: 'sayakmallickkv@gmail.com',
            pass: 'drlkspzjwmgauund',
        }
    });
};

// Helper function to validate email
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Helper function to extract name from email (for personalization)
const extractNameFromEmail = (email) => {
    const localPart = email.split('@')[0];
    return localPart.split('.').map(part =>
        part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
};

// Helper function to send individual email
const sendSingleEmail = async (transporter, mailOptions) => {
    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                reject(error);
            } else {
                resolve(info);
            }
        });
    });
};

app.get('/', (req,res) => {
    res.sendFile('./index.html');
})

// Modified single email route with SSE support
app.post('/sendemail', (req,res,) =>{
    const sessionId = `single_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    upload(req,res, function (err) {
        if(err){
            console.log(err);
            sendSSEUpdate(sessionId, {
                type: 'error',
                message: 'File upload failed'
            });
            return res.end("Something Went Wrong");
        }
        else{
            const sendEmail = (reciever, subject, content) => {
                sendSSEUpdate(sessionId, {
                    type: 'progress',
                    message: 'Preparing email template...',
                    progress: 20
                });

                ejs.renderFile(__dirname + '/templates/welcome.ejs', {
                        reciever, subject, content
                    },
                    (err, data) => {
                        if (err) {
                            console.log(err);
                            sendSSEUpdate(sessionId, {
                                type: 'error',
                                message: 'Template rendering failed'
                            });
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

                            sendSSEUpdate(sessionId, {
                                type: 'progress',
                                message: 'Connecting to email server...',
                                progress: 40,
                                details: { to: to, subject: subject }
                            });

                            var transporter = createTransporter();

                            var mailOptions = {
                                from: 'sayakmallickkv@gmail.com',
                                to: to,
                                subject: subject,
                                text:body,
                                html: data,
                                attachments: [
                                    {
                                        path: path
                                    }
                                ]
                            }

                            sendSSEUpdate(sessionId, {
                                type: 'progress',
                                message: 'Sending email...',
                                progress: 70
                            });

                            transporter.sendMail(mailOptions, function (err, info) {
                                if (err) {
                                    console.log(err);
                                    sendSSEUpdate(sessionId, {
                                        type: 'error',
                                        message: 'Email sending failed'
                                    });
                                } else {
                                    console.log("Email Sent Successfully " + info.response)

                                    sendSSEUpdate(sessionId, {
                                        type: 'complete',
                                        message: 'Email sent successfully!',
                                        progress: 100
                                    });

                                    // Close SSE connection after a delay
                                    setTimeout(() => {
                                        const connection = sseConnections.get(sessionId);
                                        if (connection) {
                                            connection.end();
                                            sseConnections.delete(sessionId);
                                        }
                                    }, 2000);

                                    return res.redirect(`/result.html?session=${sessionId}`);
                                }
                            })
                        }
                    })
        }
            var to;
            var subject;
            to = req.body.to
            subject = req.body.subject

            sendSSEUpdate(sessionId, {
                type: 'start',
                message: 'Starting email send process...',
                progress: 10,
                sessionId: sessionId
            });

            sendEmail(
                to,
                subject,
                req.body.body || "Novac Technology Solutions wishes you and your family a very happy halloween. Hope your day is full of good times and good treats."
            );
    }});
})

// Modified bulk email route with SSE support
app.post('/sendbulkemail', (req, res) => {
    const sessionId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    bulkUpload(req, res, async function (err) {
        if (err) {
            console.log('Upload error:', err);
            sendSSEUpdate(sessionId, {
                type: 'error',
                message: 'File upload error'
            });
            return res.status(500).json({ success: false, message: "File upload error" });
        }

        try {
            const { recipients, subject, body, delay = 1, personalize } = req.body;
            const attachmentPath = req.file ? req.file.path : null;

            sendSSEUpdate(sessionId, {
                type: 'start',
                message: 'Validating email addresses...',
                progress: 5,
                sessionId: sessionId
            });

            // Parse and validate recipients
            const emailList = recipients.split('\n')
                .map(email => email.trim())
                .filter(email => email.length > 0);

            const validEmails = [];
            const invalidEmails = [];

            emailList.forEach(email => {
                if (isValidEmail(email)) {
                    validEmails.push(email);
                } else {
                    invalidEmails.push(email);
                }
            });

            if (validEmails.length === 0) {
                sendSSEUpdate(sessionId, {
                    type: 'error',
                    message: 'No valid email addresses found'
                });
                return res.status(400).json({
                    success: false,
                    message: "No valid email addresses found"
                });
            }

            console.log(`Starting bulk email send to ${validEmails.length} recipients`);
            console.log(`Subject: ${subject}`);
            console.log(`Delay between emails: ${delay} seconds`);
            console.log(`Attachment: ${attachmentPath ? 'Yes' : 'No'}`);
            console.log(`Personalization: ${personalize ? 'Yes' : 'No'}`);

            sendSSEUpdate(sessionId, {
                type: 'progress',
                message: `Preparing to send ${validEmails.length} emails...`,
                progress: 10,
                totalEmails: validEmails.length,
                invalidEmails: invalidEmails.length
            });

            const transporter = createTransporter();
            const results = {
                total: validEmails.length,
                sent: 0,
                failed: 0,
                errors: [],
                invalidEmails: invalidEmails
            };

            // Send emails with delay
            for (let i = 0; i < validEmails.length; i++) {
                const email = validEmails[i];

                try {
                    sendSSEUpdate(sessionId, {
                        type: 'progress',
                        message: `Preparing email ${i + 1} of ${validEmails.length}...`,
                        progress: 10 + ((i / validEmails.length) * 80),
                        currentEmail: i + 1,
                        totalEmails: validEmails.length,
                        currentRecipient: email
                    });

                    // Personalize content if requested
                    let personalizedBody = body;
                    let personalizedSubject = subject;

                    if (personalize === 'true') {
                        const recipientName = extractNameFromEmail(email);
                        personalizedBody = `Dear ${recipientName},\n\n${body}`;
                        personalizedSubject = `${subject} - ${recipientName}`;
                    }

                    // Render email template
                    const htmlContent = await new Promise((resolve, reject) => {
                        ejs.renderFile(__dirname + '/templates/welcome.ejs', {
                            reciever: email,
                            subject: personalizedSubject,
                            content: personalizedBody
                        }, (err, data) => {
                            if (err) reject(err);
                            else resolve(data);
                        });
                    });

                    // Prepare mail options
                    const mailOptions = {
                        from: 'sayakmallickkv@gmail.com',
                        to: email,
                        subject: personalizedSubject,
                        text: personalizedBody,
                        html: htmlContent
                    };

                    // Add attachment if provided
                    if (attachmentPath) {
                        mailOptions.attachments = [{
                            path: attachmentPath
                        }];
                    }

                    sendSSEUpdate(sessionId, {
                        type: 'sending',
                        message: `Sending email ${i + 1} to ${email}...`,
                        progress: 10 + ((i / validEmails.length) * 80),
                        currentEmail: i + 1,
                        totalEmails: validEmails.length,
                        currentRecipient: email
                    });

                    // Send email
                    const info = await sendSingleEmail(transporter, mailOptions);
                    results.sent++;
                    console.log(`✅ Email ${i + 1}/${validEmails.length} sent to: ${email}`);

                    sendSSEUpdate(sessionId, {
                        type: 'email_sent',
                        message: `Email sent successfully to ${email}`,
                        progress: 10 + (((i + 1) / validEmails.length) * 80),
                        currentEmail: i + 1,
                        totalEmails: validEmails.length,
                        sentCount: results.sent,
                        failedCount: results.failed,
                        recipient: email,
                        status: 'success'
                    });

                    // Add delay between emails (except for the last one)
                    if (i < validEmails.length - 1 && delay > 0) {
                        sendSSEUpdate(sessionId, {
                            type: 'waiting',
                            message: `Waiting ${delay} seconds before next email...`,
                            progress: 10 + (((i + 1) / validEmails.length) * 80),
                            delay: delay
                        });
                        await new Promise(resolve => setTimeout(resolve, delay * 1000));
                    }

                } catch (emailError) {
                    results.failed++;
                    results.errors.push({
                        email: email,
                        error: emailError.message
                    });
                    console.log(`❌ Failed to send to ${email}: ${emailError.message}`);

                    sendSSEUpdate(sessionId, {
                        type: 'email_failed',
                        message: `Failed to send to ${email}`,
                        progress: 10 + (((i + 1) / validEmails.length) * 80),
                        currentEmail: i + 1,
                        totalEmails: validEmails.length,
                        sentCount: results.sent,
                        failedCount: results.failed,
                        recipient: email,
                        status: 'failed',
                        error: emailError.message
                    });
                }
            }

            // Log final results
            console.log('\n📊 Bulk Email Results:');
            console.log(`Total: ${results.total}`);
            console.log(`Sent: ${results.sent}`);
            console.log(`Failed: ${results.failed}`);
            if (results.invalidEmails.length > 0) {
                console.log(`Invalid emails: ${results.invalidEmails.join(', ')}`);
            }

            sendSSEUpdate(sessionId, {
                type: 'complete',
                message: 'Bulk email campaign completed!',
                progress: 100,
                results: results
            });

            // Close SSE connection after a delay
            setTimeout(() => {
                const connection = sseConnections.get(sessionId);
                if (connection) {
                    connection.end();
                    sseConnections.delete(sessionId);
                }
            }, 3000);

            // Redirect to results page with success message
            return res.redirect(`/bulk-result.html?session=${sessionId}`);

        } catch (error) {
            console.error('Bulk email error:', error);
            sendSSEUpdate(sessionId, {
                type: 'error',
                message: 'Internal server error during bulk email send',
                error: error.message
            });
            return res.status(500).json({
                success: false,
                message: "Internal server error during bulk email send"
            });
        }
    });
});

app.listen(port, () => {
    console.log(`🚀 Server is running at: http://localhost:${port}`);
})