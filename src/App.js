import "./App.css";
import { useRef, useState } from "react";

function App() {
  const [decodedString, setDecodedString] = useState("");
  const inputRef = useRef(null);
  const QLR_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
  const QLR_SUB_CHAR2 = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // write
  const QLR_SUB_CHAR1 = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // notify
  const SY_SERVICE = "c1b25000-caaf-6d0e-4c33-7dae30052840";
  //const SY_SUB_INDIC = "c1b25010-caaf-6d0e-4c33-7dae30052840";
  //const SY_SUB_NOTIF = "c1b25013-caaf-6d0e-4c33-7dae30052840";
  //const SY_SUB_CMD = "c1b25012-caaf-6d0e-4c33-7dae30052840";

  const bleConnectOptions = {
    filters: [
      { services: [QLR_SERVICE] },
      { services: [SY_SERVICE] },
      /* { name: "014333573" },
      { name: "UWAVE" },*/
      { namePrefix: "SY" },
    ],
  };

  const connectDevice = async () => {
    try {
      //show drop down list with devices to connect
      const device = await navigator.bluetooth.requestDevice(bleConnectOptions);
      console.log("device", device);

      //connect gatt server within the device
      console.log("connceting gatt server");
      const server = await device.gatt.connect();
      console.log("gatt server connected", server);

      //read ble services witihin the device
      console.log("connecting services ...");
      const service = await server.getPrimaryService(QLR_SERVICE);
      console.log("services", service);
      // read ble characteristic within the device
      const notifCharacteristics = await service.getCharacteristic(
        QLR_SUB_CHAR1
      );
      console.log(
        "Notification characteristic " + JSON.stringify(notifCharacteristics)
      );
      await notifCharacteristics.startNotifications();
      console.log("Notification characteristics notifications started");
      notifCharacteristics.addEventListener(
        "characteristicvaluechanged",
        handleInd
      );

      const indicCharacteristic = await service.getCharacteristic(
        QLR_SUB_CHAR1
      );
      console.log(
        "Indication characteristic " + JSON.stringify(indicCharacteristic)
      );
      await indicCharacteristic.startNotifications();
      console.log("Idication characteristics notifications started");
      indicCharacteristic.addEventListener(
        "characteristicvaluechanged",
        handleInd
      );
      window.cmdCharacteristic = await service.getCharacteristic(QLR_SUB_CHAR2);
      console.log("CMD characteristic", window.cmdCharacteristic);
      window.cmdCharacteristic.addEventListener("submit", writeCommand, false);
      /*  let enc = new TextEncoder("utf-8");
      indicCharacteristic.writeValue(enc.encode("?\r"));
      window.btch = indicCharacteristic;*/
    } catch (err) {
      console.error("error", err);
    }
  };
  function handleInd(event) {
    let value = event.target.value;
    const decoder = new TextDecoder("utf-8");
    const decodedValue = decoder.decode(value);
    setDecodedString(decodedValue);
    console.log("Read value", decodedValue);
  }
  const handleClick = () => {
    const value = inputRef.current.value;
    console.log("handleClick", value);
    writeCommand(value);
  };
  const enc = new TextEncoder("utf-8");

  function writeCommand(cmd) {
    console.log("Command received", enc.encode(cmd + "\r"));
    window.cmdCharacteristic.writeValue(enc.encode(cmd + "\r"));
  }
  return (
    <div className="App">
      <button onClick={connectDevice}>add device</button>
      <h1>device</h1>
      <div> Value from an instrument = {decodedString}</div>

      <input ref={inputRef} type="text" />
      <button onClick={handleClick}>Submit</button>
    </div>
  );
}

export default App;
