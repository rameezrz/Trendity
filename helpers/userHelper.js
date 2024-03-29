const User = require("../Models/userSchema");
const Wallet = require('../Models/walletSchema')
const bcrypt = require("bcrypt");
const { sign } = require("jsonwebtoken");
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const verifySid = process.env.VERIFY_SID;
const client = require("twilio")(accountSid, authToken);



module.exports = {
  //Finding whether user is already registered or not
  findSignUp: (dataBody) => {
    let { email, phone } = dataBody;
    let response = {};
    return new Promise(async (resolve, reject) => {
      try {
        const userFind = await User.findOne({
          $or: [{ email: email }, { phone: phone }],
        });
        if (userFind) {
          response.status = false;
          response.message = "User Already Exists";
          resolve(response);
        } else {
          response.status = true;
          response.message = "User Not registered";
          resolve(response);
        }
      } catch (e) {
        reject(e);
      }
    });
  },

  //Registering new User details to database
  signUp: (dataBody) => {
    return new Promise(async (resolve, reject) => {
      try {
        const { name, email, phone, password } = dataBody;
        const newUser = new User({
          name,
          email,
          phone,
        });
        newUser.password = await bcrypt.hash(password, 10);
        newUser.isBlocked = false;
        newUser.save().then((user) => {
          const newWallet = new Wallet({
            user:user._id
          })
          newWallet.save()
          resolve(user);
        });
      } catch (e) {
        reject(e);
      }
    });
  },

  //Sign in Function for registered Users
  signIn: (userData) => {
    const { email, password } = userData;
    let response = {};
    return new Promise(async (resolve, reject) => {
      try {
        const user = await User.findOne({ email: email });
        if (!user) {
          response.status = false;
          response.message = "User Doesn't Exist";
          resolve(response);
        }
        if (user.isBlocked) {
          response.status = false;
          response.message = "Account Blocked. Contact Admin!!!";
          resolve(response);
        }
        const dbPassword = user.password;
        await bcrypt.compare(password, dbPassword).then((match) => {
          if (!match) {
            response.status = false;
            response.message = "Invalid Login Credintials";
            resolve(response);
          } else {
            response.status = true;
            response.message = "User Logged In";
            response.user = user;
            resolve(response);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  },

  //sending otp to the given mobile number
  sendOtp: async (mob) => { 
    await client.verify.v2
      .services(verifySid)
      .verifications.create({ to: `+91${mob}`, channel: "sms" });
  },

  

  //creating JWT Token to user for Authorization
  createJwtToken: (user) => {
    const accessToken = sign(
      {
        userName: user.name,
        id: user._id,
      },
      process.env.JWT_SECRET
    );
    return accessToken;
  },
};
