const puppeteer = require('puppeteer-extra');
const pluginStealth = require("puppeteer-extra-plugin-stealth");
puppeteer.use(pluginStealth());
const fs = require('fs');
const path = require('path');
const Agenda = require('agenda');

const mongoConnectionString = 'mongodb://127.0.0.1/oracle';
const agenda = new Agenda({ db: { address: mongoConnectionString } });

let download_path = path.resolve('download');
let headless = true

let account_name = '';
let username = ''
let password = ''

async function login() {
	const browser = await getBrowser(browser_key);
	const ws_endpoint = browser.wsEndpoint();
	console.log(ws_endpoint);
  const page = await browser.newPage();
	await page.goto('https://www.oracle.com/cloud/sign-in.html')
}

async function create_compute_instance() {
	try {
		const browser = await getBrowser(browser_key);
		const ws_endpoint = browser.wsEndpoint();
		console.log(ws_endpoint);
		const page = await browser.newPage();
		await page.goto('https://cloud.oracle.com/compute/instances?region=ap-singapore-1')
		await sleep(3000);
		try {
			await page.waitForSelector('#cloudAccountButton', {timeout:5000})
			await page.evaluate(() => {
				let temp_a = document.querySelector('#cloudAccountButton')
				temp_a.focus();
				temp_a.click();
				temp_a.blur();
			})
		}
		catch(e){
			console.log('wait #cloudAccountButton timeout')
		}
		await sleep(10*1000);
		await page.waitForFunction(() => {
			return !!document.querySelector('iframe#sandbox-compute-container');
		})
		let iframe = await page.frames().find(e => e._name == 'sandbox-compute-container');
		await iframe.waitForFunction(() => {
			return !!Array.from(document.querySelectorAll('button')).find(e => e.textContent == 'Create instance');
		})
		await iframe.evaluate(() => {
			let temp_a = Array.from(document.querySelectorAll('button')).find(e => e.textContent == 'Create instance');
			temp_a.focus();
			temp_a.click();
			temp_a.blur();
		})
		await sleep(3000)
		await page.waitForFunction(() => {
			return !!document.querySelector('iframe#sandbox-compute-container');
		})
		await iframe.evaluate(() => {
			let temp_a = Array.from(document.querySelectorAll('legend')).find(e => e.textContent == 'Networking').parentElement.parentElement.children[1].children[0]
			temp_a.focus();
			temp_a.click();
			temp_a.blur();
		})
		await sleep(3000);
		let client = await page.target().createCDPSession()
		await client.send('Page.setDownloadBehavior', {
			behavior: 'allow',
			downloadPath: download_path
		});
		await iframe.evaluate(() => {
			let temp_a = Array.from(document.querySelectorAll('button')).find(e => e.innerText == 'Save private key')
			temp_a.focus();
			temp_a.click();
			temp_a.blur();
		})
		await sleep(2000);
		let is_out_of_capacity = false;
		let is_other_error = false;
		do{
			await iframe.evaluate(() => {
				let temp_a = Array.from(document.querySelectorAll('button')).find(e => e.textContent == 'Create')
				temp_a.focus();
				temp_a.click();
				temp_a.blur();
			})
			await sleep(2000);
			let is_error = await iframe.evaluate(() => {
				return !!document.querySelector('div[role="alert"]');
			})
			if(is_error) {
				let error_msg = await iframe.evaluate(() => {
					return document.querySelector('div[role="alert"]').textContent
				})
	
				let second_to_wait = 35;
				if(error_msg.startsWith('Out of capacity')) {
					second_to_wait = 35;
					console.log(`Out of capacity, wait ${second_to_wait} sec`)
					is_out_of_capacity = true;
					await sleep(second_to_wait*1000)
				}
				else {
					is_out_of_capacity = false;
					is_other_error = true;
					second_to_wait = 65;
					console.log(`other error msg: ${error_msg} wait ${second_to_wait} sec`)
					await sleep(second_to_wait*1000)
				}
			}
		}while(is_out_of_capacity || is_other_error)

		console.log('maybe success')
	}
	catch(e) {
		console.log(e.stack)
	}
}

async function test() {
	console.log(new Date(Date.now()).toISOString());
}

let browser_key = 'oracle_browser'
const instances = new Map();
async function getBrowser(key) {
	if(!instances.get(key)) {
		const browser = await puppeteer.launch({
			headless,
			defaultViewport: {
				width: 1200,
				height: 800
			},
			executablePath : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
			args : [ 
				"--user-data-dir=/Users/maxfong/oracle-cloud/userDatas/aaa/userData"
			]
		});
		instances.set(key, browser);
	}
	return instances.get(key);
} 

async function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

// login().then().catch(e => console.log(e));
// create_compute_instance().then().catch(e => console.log(e));
// test().then().catch(e => console.log(e));

agenda.define('create compute instance', async (job, done) => {
	try {
		const browser = await getBrowser(browser_key);
		const ws_endpoint = browser.wsEndpoint();
		console.log(ws_endpoint);
		const page = await browser.newPage();
		await page.goto('https://cloud.oracle.com/compute/instances?region=ap-singapore-1')
		await sleep(6*1000);
		try {
			let need_type_login_account = await page.evaluate(() => {
				return !document.querySelector('#cloudAccountName').value
			})
			if(need_type_login_account) {
				await page.type('#cloudAccountName', account_name)
			}
			await page.waitForSelector('#cloudAccountButton', {timeout:5000})
			await page.evaluate(() => {
				let temp_a = document.querySelector('#cloudAccountButton')
				temp_a.focus();
				temp_a.click();
				temp_a.blur();
			})
			await sleep(3000)
		}
		catch(e){
			console.log('wait #cloudAccountButton timeout')
		}
		await sleep(8*1000);
		// login
		// check if need login
		let need_login = await page.url().includes('signin') || await page.url().includes('login');
		if(need_login) {
			console.log('need login');
			await sleep(5*1000);
			if(await page.url().includes('login')) {
				await page.click('#submit-tenant')
				await sleep(1000*5)
			}
			await page.type('#idcs-signin-basic-signin-form-username', username)
			await page.type('input[type="password"]', password);
			await Promise.all([
				page.keyboard.press('Enter'),
				page.waitForNavigation()
			])
			await sleep(7*1000)
		}
		await page.waitForFunction(() => {
			return !!document.querySelector('iframe#sandbox-compute-container');
		})
		let iframe = await page.frames().find(e => e._name == 'sandbox-compute-container');
		await iframe.waitForFunction(() => {
			return !!Array.from(document.querySelectorAll('button')).find(e => e.textContent == 'Create instance');
		})
		await iframe.evaluate(() => {
			let temp_a = Array.from(document.querySelectorAll('button')).find(e => e.textContent == 'Create instance');
			temp_a.focus();
			temp_a.click();
			temp_a.blur();
		})
		await sleep(3000)
		await page.waitForFunction(() => {
			return !!document.querySelector('iframe#sandbox-compute-container');
		})
		await iframe.evaluate(() => {
			let temp_a = Array.from(document.querySelectorAll('legend')).find(e => e.textContent == 'Networking').parentElement.parentElement.children[1].children[0]
			temp_a.focus();
			temp_a.click();
			temp_a.blur();
		})
		await sleep(3000);
		let client = await page.target().createCDPSession()
		await client.send('Page.setDownloadBehavior', {
			behavior: 'allow',
			downloadPath: download_path
		});
		await iframe.evaluate(() => {
			let temp_a = Array.from(document.querySelectorAll('button')).find(e => e.innerText == 'Save private key')
			temp_a.focus();
			temp_a.click();
			temp_a.blur();
		})
		await sleep(2000);
		await iframe.evaluate(() => {
			let temp_a = Array.from(document.querySelectorAll('button')).find(e => e.textContent == 'Create')
			temp_a.focus();
			temp_a.click();
			temp_a.blur();
		})
		await sleep(2000);
		try {
			await iframe.waitForSelector('div[role="alert"]')
			let is_error = await iframe.evaluate(() => {
				return !!document.querySelector('div[role="alert"]');
			})
			if(is_error) {
				let error_msg = await iframe.evaluate(() => {
					return document.querySelector('div[role="alert"]').textContent
				})
	
				if(error_msg.startsWith('Out of capacity')) {
					console.log('Out of capacity')
				}
				else {
					console.log(`other error: ${error_msg}`)
				}
				// delete downloaded private key
				let filenames = await fs.promises.readdir(download_path)
				for(let filename of filenames) {
					// delete file created within 10 sec of this program run
					let file_path = `${download_path}/${filename}`;
					let stat = await fs.promises.stat(file_path);
					if(stat.ctimeMs > (Date.now()-5*1000)) {
						await fs.promises.unlink(file_path)
						console.log('file deleted')
						break;
					}
				}
				if(page && !page.isClosed()) {
					await page.close();
				}
			}
		}
		catch(e) {
			console.log(e);
			console.log(`no error maybe success`);
			if(!job.attrs.success_count) {
				job.attrs.success_count = 0;
			}
			job.attrs.success_count += 1;
		}
		done();
	}
	catch(e) {
		console.log(`job error e.stack ${e.stack}`);
		if(!job.attrs.errors) {
			job.attrs.errors = [];
		}
		job.attrs.errors.push(e.stack)
		job.attrs.nextRunAt = new Date(Date.now() + 60*1000)
		done()
	}
});

(async function () {
	await agenda.start();
	agenda.every('35 seconds', 'create compute instance');
})();