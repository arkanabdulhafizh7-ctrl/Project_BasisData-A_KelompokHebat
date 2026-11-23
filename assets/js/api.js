(function (global) {
  "use strict";

  const TOKEN_KEY = "rs_api_token";
  const DEFAULT_BASE_URL = "http://localhost:3000/api";
  const baseUrl = (global.ROALSHOES_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");

  function getToken() {
    return global.sessionStorage.getItem(TOKEN_KEY);
  }

  function saveToken(token) {
    if (token) {
      global.sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      global.sessionStorage.removeItem(TOKEN_KEY);
    }
  }

  async function request(path, options) {
    const config = options || {};
    const headers = { Accept: "application/json" };
    const token = getToken();

    if (config.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (token) {
      headers.Authorization = "Bearer " + token;
    }

    let response;
    try {
      response = await global.fetch(baseUrl + path, {
        method: config.method || "GET",
        headers: headers,
        body: config.body === undefined ? undefined : JSON.stringify(config.body)
      });
    } catch (error) {
      throw new Error("Tidak dapat menghubungi backend. Periksa server dan koneksi jaringan.");
    }

    let data = null;
    if (response.status !== 204) {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.indexOf("application/json") !== -1) {
        try {
          data = await response.json();
        } catch (error) {
          throw new Error("Backend mengirim respons JSON yang tidak valid.");
        }
      } else {
        data = await response.text();
      }
    }

    if (!response.ok) {
      const message = data && typeof data === "object" && data.message
        ? data.message
        : "Permintaan gagal (" + response.status + " " + response.statusText + ").";
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  function idPath(path, id) {
    return path + "/" + encodeURIComponent(id);
  }

  const api = {
    baseUrl: baseUrl,
    setToken: saveToken,
    clearToken: function () {
      saveToken(null);
    },
    auth: {
      register: function (payload) {
        return request("/auth/register", { method: "POST", body: payload });
      },
      login: async function (payload) {
        const result = await request("/auth/login", { method: "POST", body: payload });
        if (result && result.token) saveToken(result.token);
        return result;
      },
      me: function () {
        return request("/auth/me");
      },
      logout: function () {
        saveToken(null);
      }
    },
    services: {
      list: function () {
        return request("/services");
      },
      get: function (id) {
        return request(idPath("/services", id));
      },
      create: function (payload) {
        return request("/services", { method: "POST", body: payload });
      },
      update: function (id, payload) {
        return request(idPath("/services", id), { method: "PUT", body: payload });
      },
      remove: function (id) {
        return request(idPath("/services", id), { method: "DELETE" });
      }
    },
    orders: {
      list: function () {
        return request("/orders");
      },
      get: function (id) {
        return request(idPath("/orders", id));
      },
      create: function (payload) {
        return request("/orders", { method: "POST", body: payload });
      },
      update: function (id, payload) {
        return request(idPath("/orders", id), { method: "PUT", body: payload });
      },
      updateStatus: function (id, statusOrder) {
        return request(idPath("/orders", id) + "/status", {
          method: "PATCH",
          body: { status_order: statusOrder }
        });
      }
    },
    payments: {
      list: function () {
        return request("/payments");
      },
      create: function (payload) {
        return request("/payments", { method: "POST", body: payload });
      },
      updateStatus: function (id, statusBayar) {
        return request(idPath("/payments", id) + "/status", {
          method: "PATCH",
          body: { status_bayar: statusBayar }
        });
      }
    }
  };

  global.RoalshoesAPI = api;
})(window);
