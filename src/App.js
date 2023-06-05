import "./App.css";
import { useState } from "react";

function App() {
  const [decodedString, setDecodedString] = useState("");

  const QLR_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
  //const QLR_SUB_CHAR2 = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";// write
  const QLR_SUB_CHAR1 = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // notify
  const bleConnectOptions = {
    filters: [
      { services: [QLR_SERVICE] },
      /* { name: "014333573" },
      { name: "UWAVE" },
      { namePrefix: "SY" },*/
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
        handleNotif
      );
    } catch (err) {
      console.error("error", err);
    }
  };
  function handleNotif(event) {
    let value = event.target.value;
    const decoder = new TextDecoder("utf-8");
    const decodedValue = decoder.decode(value);
    setDecodedString(decodedValue);
    console.log("Read value", decodedValue);
  }
  return (
    <div className="App">
      <button onClick={connectDevice}>add device</button>
      <h1>device</h1>
      <div> Value from an instrument = {decodedString}</div>
    </div>
  );
}

export default App;
