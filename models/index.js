const { dbConnection } = require("../connection");
const requestSchema = require("./request");


module.exports.Request = dbConnection.model('Request', requestSchema); 