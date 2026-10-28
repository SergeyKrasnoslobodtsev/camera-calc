// ---------- состояние, которое меняют несколько модулей: импортированную переменную присвоить нельзя, поле объекта — можно
export const store = {
  cameraTypes: [], // типы камер, заполняет state.js
  activeTypeId: null,
  customGpus: [], // свои карты: {id,name,arch,tflops,nvdec|decodeStreams,memoryGB,tdpW,price,jetson,custom:true}
  gpuPrices: {}, // правки цен по id
  gpuEnabled: {}, // участие в подборе по id
  customCameras: [],
  customDetectors: [],
};
