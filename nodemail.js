const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport('SMTP', {
  service: 'Gmail',
  auth: {
    user: 'plat123456789@gmail.com',
    pass: "_G0h?%7ATpp*yF|%Z\@Qh%prxQL!$5Aads.q?*m3Nk\8IQ';XeoUpt|\9Mo/0crM",
  },
});

async function sendAlertEmail(email_obj) {
  const {
    subject, text, attachments=[],
    email_from, email_to, email_cc = '',
  } = email_obj;

  try {
    if(!email_from || !email_to) {
      throw new Error(`nodemail error : missing email_from or email_to`)
    }

    const message = {
      from: email_from,
      to: email_to,
      cc: email_cc,
      subject,
      text,
      attachments
    }
    await transporter.sendMail(message);
    console.log('nodemail', `Alert eMail sent to TO:[${email_from}] and CC:[${email_cc}]`);
  } catch(e) {
    console.log('nodemail', e.stack);
  }
}

module.exports.sendAlertEmail = sendAlertEmail;