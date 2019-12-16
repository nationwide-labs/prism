import * as request from "request";

class APIStorageConfig {
  server: string;
  username: string;
  password: string;
}

export class APIStorage {
  private config: APIStorageConfig;

  constructor(config: APIStorageConfig) {
    this.config = config;
  }

  getData = async (context, callback) => {
    return request.post({
      url: this.config.server + '/api/userData/get',
      headers: {
        Authorization: "Basic " + Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")
      },
      json: true,
      body: {
        context: context
      }
    }, (err, resp, body) => {
      if (err) {
        return callback(err);
      }

      if (resp.statusCode !== 200) {
        return callback("Error getting data: " + resp.statusCode);
      }

      return callback(null, body);
    });
  }

  saveData = async (context: any, data: any, callback: any) => {
    return request.post({
      url: this.config.server + '/api/userData/set',
      headers: {
        Authorization: "Basic " + Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")
      },
      json: true,
      body: {
        context: context,
        data: data
      }
    }, (err, resp, body) => {
      if (err) {
        return callback(err);
      }

      if (resp.statusCode !== 200) {
        return callback("Error saving data: " + resp.statusCode);
      }

      return callback(null);
    });
  }
}
