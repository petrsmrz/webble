import "./App.css";
import React from "react";
import { useRef, useState } from "react";

function App() {
  //const [number, setNumber] = useState(0);
  const [syDecodedString, setSyDecodedString] = useState("");
  const [dtDecodedString, setDtDecodedString] = useState("");
  const [mtDecodedString, setMtDecodedString] = useState("");

  const inputRef = useRef(null);
  // QLR service and characteristics
  const QLR_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
  const QLR_SUB_WRITE = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // write
  const QLR_SUB_NOFIT = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // notify
  // Sylvac service and characteristics
  const SY_SERVICE = "c1b25000-caaf-6d0e-4c33-7dae30052840";
  const SY_SUB_INDIC = "c1b25010-caaf-6d0e-4c33-7dae30052840";
  const SY_SUB_NOTIF = "c1b25013-caaf-6d0e-4c33-7dae30052840";
  const SY_SUB_CMD = "c1b25012-caaf-6d0e-4c33-7dae30052840";
  
  // Mitutoyo service and characteristics
  const MT_SERVICE = "7eafd361-f150-4785-b307-47d34ed52c3c";
  const MT_SUB_CHAR = "7eafd361-f151-4785-b307-47d34ed52c3c";
  const MT_TRI_CHAR = "7eafd361-f155-4785-b307-47d34ed52c3c";

  // Werka new indicator BLE5
  const WERKA_SERVICE = "00035b03-58e6-07dd-021a-08123a000300";
  const WERKA_SUB_WRITE = "00035b03-58e6-07dd-021a-08123a0003ff"; // read write
  const WERKA_SUB_INDIC = "00035b03-58e6-07dd-021a-08123a000301"; // read write indicate

  const extractCharacters = (name, startIndex, endIndex) => {
    return name.substring(startIndex, endIndex);
  };
  function formatToOriginalDecimals(inputString) {
    // Parse the input string as a float
    const parsedNumber = parseFloat(inputString);
  
    // Find the number of decimal places in the input string
    const decimalIndex = inputString.indexOf('.');
    const decimalPlaces = decimalIndex !== -1 ? inputString.length - decimalIndex - 1 : 0;
  
    // Format the parsed number to the original number of decimal places
    const formattedNumber = parsedNumber.toFixed(decimalPlaces);
  
    // Remove trailing zeros by parsing it again as a float and then converting it to a string
    return parseFloat(formattedNumber).toString();
  }
  
  const bleConnectOptions = {
    filters: [
      { services: [QLR_SERVICE] },
      { services: [SY_SERVICE] },
      { services: [WERKA_SERVICE] },
      { services: [MT_SERVICE] },
      { name: extractCharacters( "014333038",0,4) },
      { name: "UWAVE" },
      { namePrefix: "SY" },
    ],
  };
 console.log("BLE Connect Options", bleConnectOptions);

  const connectDevice = async () => {
    try {
      //show drop down list with devices to connect
      const device = await navigator.bluetooth.requestDevice(bleConnectOptions);
      console.log("device", device);
      console.log("device name", device.name);
      const deviceName = device.name;

      //connect gatt server within the device
      console.log("connceting gatt server");
      const server = await device.gatt.connect();
      console.log("gatt server connected", server);

      // choose setvice as per manufacturer config
      const useService = device.name.startsWith("SY")
        ? SY_SERVICE
        : device.name.startsWith("D")
        ? WERKA_SERVICE
        :device.name.startsWith(deviceName)
        ? MT_SERVICE
        : QLR_SERVICE;

      const useNotifChar = device.name.startsWith("SY")
        ? SY_SUB_NOTIF
        : device.name.startsWith("D")
        ? WERKA_SUB_INDIC
        :device.name.startsWith(deviceName)
        ? MT_SUB_CHAR
        : QLR_SUB_NOFIT;
      console.log("Selected Notification Char =", useNotifChar);

      const useIndChar = device.name.startsWith("SY")
        ? SY_SUB_INDIC
        : device.name.startsWith("D")
        ? WERKA_SUB_INDIC
        :device.name.startsWith(deviceName)
        ? MT_SUB_CHAR
        : QLR_SUB_NOFIT;
      console.log("Selected Indication Char =", useIndChar);

      const useCmdChar = device.name.startsWith("SY")
        ? SY_SUB_CMD
        : device.name.startsWith("D")
        ? WERKA_SUB_WRITE
        :device.name.startsWith(deviceName)
        ? MT_TRI_CHAR
        : QLR_SUB_WRITE;

      //read ble services witihin the device
      console.log("connecting services ...");
      const service = await server.getPrimaryService(useService);
      console.log("services", service);

      // read ble characteristic within the device
      const notifCharacteristics = await service.getCharacteristic(
        useNotifChar
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

      const indicCharacteristic = await service.getCharacteristic(useIndChar);
      console.log(
        "Indication characteristic " + JSON.stringify(indicCharacteristic)
      );
      await indicCharacteristic.startNotifications();
      console.log("Idication characteristics notifications started");
      indicCharacteristic.addEventListener(
        "characteristicvaluechanged",
        handleInd
      );
      window.cmdCharacteristic = await service.getCharacteristic(useCmdChar);
      console.log("CMD characteristic", window.cmdCharacteristic);
      window.cmdCharacteristic.addEventListener("submit", writeCommand, false);
      /*  let enc = new TextEncoder("utf-8");
      indicCharacteristic.writeValue(enc.encode("?\r"));
      window.btch = indicCharacteristic;*/

      function handleInd(event) {
        let value = event.target.value;
        console.log("Value =", value);
        if (device.name.startsWith("SY") || device.name.startsWith("Q")) {
          const syDecoder = new TextDecoder("utf-8"); // Sylvac decoder
          const syDecodedValue = syDecoder.decode(value);
          setSyDecodedString(syDecodedValue);
          console.log("Read SY value", syDecodedValue);
        } else if (device.name.startsWith(deviceName)) {
          const mtDecodedValue = mtDecoder(value);
          setMtDecodedString(mtDecodedValue);
          console.log("Read MT value", mtDecodedValue);
        } else {
          const dtDecodedValue = dtDecoder(value);
          setDtDecodedString(dtDecodedValue);
          console.log("Read DT value", dtDecodedValue);
        }
      }
      // Mitutoyo decoder
      function mtDecoder(val) {
        console.log("mtDecoder echo Read value ", val);
        const dataView = new DataView(val.buffer);
        const uwaveVal =
          dataView.getInt32(3, true) / 10 ** ((dataView.getUint8(2) << 8) >> 8);
        const mtDecodedValue = uwaveVal.toString().trim();
        return mtDecodedValue;
      }
      // Werka decoder
      function dtDecoder(val) {
        console.log("dtDecoder val", val);

        const sliced = [...new Uint8Array(val.buffer)];
        console.log("dtDecoder sliced", sliced);

        const v = buf2hex(val.buffer);

        console.log("dtDecoder v", v);

        //const v1 = v.slice(-7, -2).replace(/^0+/, '') + '.' + v.slice(-2);
        let v1 = v.slice(4);
        const isNegative = isKthBitSet(sliced[1], 7);
        const isInches = isKthBitSet(sliced[1], 6);
        const decimals = 2 + 2 * kthBit(sliced[1], 1) + kthBit(sliced[1], 0);
        v1 =
          (isNegative ? "-" : "") +
          v1.slice(-7, -decimals) +
          "." +
          v1.slice(-decimals);
        console.log("dtDecoder v1", v1, isNegative, isInches, decimals);
        // console.log('v1 ' + v1)
        const decodedValue = Intl.NumberFormat("en-GB", {
          signDisplay: "always",
          maximumSignificantDigits: 5,
        }).format(v1);
        console.log("dtDecoder decodedValue", decodedValue);
        return decodedValue;
      }

      function buf2hex(buffer) {
        // buffer is an ArrayBuffer
        return [...new Uint8Array(buffer)]
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("");
      }

      function isKthBitSet(n, k) {
        if ((n & (1 << k)) > 0) return true;
        else return false;
      }

      function kthBit(n, k) {
        if ((n & (1 << k)) > 0) return 1;
        else return 0;
      }
    } catch (err) {
      console.error("error", err);
    }
  };
  /* function handleInd(event) {
    let value = event.target.value;
    const decoder = new TextDecoder("utf-8");
    const decodedValue = decoder.decode(value);
    setSyDecodedString(decodedValue);
    console.log("Read value", decodedValue);
  }
    */
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
      <button
        style={{ padding: "10px", width: "200px", margin: "20px" }}
        onClick={connectDevice}
      >
        <h1 style={{ padding: "0px", margin: "5px" }}>add device</h1>
      </button>

      <div style={{ padding: "50px" }}>
        <h1>
          Value from device
          <br />
          <p style={{ color: "green" }}>{formatToOriginalDecimals(syDecodedString)}</p>
          <p style={{ color: "green" }}>{dtDecodedString}</p>
          <p style={{ color: "green" }}>{mtDecodedString}</p>
        </h1>
      </div>
      <div style={{ padding: "0px" }}>
        <input
          style={{
            padding: "10px",
            width: "400px",
            marginBottom: "10px",
            fontSize: "25px",
          }}
          ref={inputRef}
          type="text"
        />
        <br />
        <button
          style={{
            padding: "10px",
            width: "200px",
            margin: "20px",
            
          }}
          onClick={handleClick}
        >
          <h1 style={{ padding: "0px", margin: "5px" }}>Submit</h1>
        </button>
      </div>
    </div>
  );
}

export default App;
