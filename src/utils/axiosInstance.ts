import axios from "axios";

const axiosInstance = axios.create({
  responseType: "arraybuffer",
});

axiosInstance.interceptors.response.use((response) => {
  if (response.data instanceof Uint8Array) response.data = response.data.buffer;
  return response;
});

export default axiosInstance;
