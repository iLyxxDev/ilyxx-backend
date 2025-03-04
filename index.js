const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const https = require('https');

const option = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};
app.use(compression({
    level: 5,
    threshold: 0,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));
app.set('view engine', 'ejs');
app.set('trust proxy', 1);
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
    );
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url} - ${res.statusCode}`);
    next();
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 100, headers: true }));
app.all('/player/register', function(req, res) {
    res.render(__dirname + '/public/html/register.ejs', {warn: ''});
});
app.all('/player/login/dashboard', function (req, res) {
    const tData = {};
    try {
        const uData = JSON.stringify(req.body).split('"')[1].split('\\n'); const uName = uData[0].split('|'); const uPass = uData[1].split('|');
        for (let i = 0; i < uData.length - 1; i++) { const d = uData[i].split('|'); tData[d[0]] = d[1]; }
        if (uName[1] && uPass[1]) { res.redirect('/player/growid/login/validate'); }
    } catch (why) { console.log(`Warning: ${why}`); }

    res.render(__dirname + '/public/html/dashboard.ejs', {data: tData, data1: '', data2: ''});
});

app.all('/player/growid/login/validate', (req, res) => {
    const _token = req.body._token;
    const growId = req.body.growId;
    const password = req.body.password;

    const token = Buffer.from(
        `_token=${_token}&growId=${growId}&password=${password}`,
    ).toString('base64');
   
    res.send(
        `{"status":"success","message":"Account Validated.","token":"${token}","url":"","accountType":"growtopia"}`,
    );
});
app.all('/player/growid/register/validate', (req, res) => {
    const _token = req.body._token;
    const growid = req.body.growId;
    const password = req.body.password;
    const email = req.body.email;
    if (password.length >= 8 && email.includes('@gmail.com')) {
        const check_file = path.join(__dirname, `../Eclipse Core/database/players`);
        const file_name = `${growid}_.json`;
        fs.readdir(check_file, (err, files) => {
            if (err) {
                return res.sendStatus(404);
            }
            const validated_file = files.find(file => file.toLowerCase() === file_name.toLowerCase());
            if (validated_file) return res.render(__dirname + '/public/html/register.ejs', { warn: 'GTPSID name have been used, please try again with another name' });
            let data = {
                name: growid,
                password: password,
                email: email,
                new_account: true
            };
            const c_acc = path.join(check_file, file_name);
            fs.writeFileSync(c_acc, JSON.stringify(data, null, 2));
            res.render(__dirname+ '/public/html/dashboard.ejs', { data1: growid, data2: password });

        });
    }
    else {
        return res.render(__dirname + '/public/html/register.ejs', { warn: 'Invalid Password or Email' });
    }
});

app.all('/player/growid/checktoken', (req, res) => {
    const { refreshToken } = req.body;
    res.json({
        status: 'success',
        message: 'Account Validated.',
        token: refreshToken,
        url: '',
        accountType: 'growtopia',
    });
});
app.get('/', function (req, res) {
   res.send('Hello Memek');
});

https.createServer(option, app).listen(50000, function () {
    console.log('HTTPS Listening on port 50000');
});
