function send(inParams) {
  const params = {
    key: "asd1234asd",
    target: "zalog",
    text: "error",
    id: "1234",
  };
  const queryParams = new URLSearchParams(Object.assign(params, inParams));
  const url = `https://api.checklic.ru/api/humanpost?${queryParams.toString()}`;

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  }).finally(() => url);
}

module.exports = {
  send,
};
