import "./App.css";
import React, { useRef, useState } from "react";

function App() {
  const [syDecodedString, setSyDecodedString] = useState("");
  const [dtDecodedString, setDtDecodedString] = useState("");
  const [mtDecodedString, setMtDecodedString] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  

  const inputRef = useRef(null);

  // Service and characteristics UUIDs
  const SERVICES = {
    QLR: {
      service: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
      write: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
      notify: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
    },
    SY: {
      service: "c1b25000-caaf-6d0e-4c33-7dae30052840",
      indic: "c1b25010-caaf-6d0e-4c33-7dae30052840",
      notify: "c1b25013-caaf-6d0e-4c33-7dae30052840",
      cmd: "c1b25012-caaf-6d0e-4c33-7dae30052840",
    },
    MT: {
      service: "7eafd361-f150-4785-b307-47d34ed52c3c",
      char: "7eafd361-f151-4785-b307-47d34ed52c3c",
      trigger: "7eafd361-f155-4785-b307-47d34ed52c3c",
    },
    WERKA: {
      service: "00035b03-58e6-07dd-021a-08123a000300",
      write: "00035b03-58e6-07dd-021a-08123a0003ff",
      indic: "00035b03-58e6-07dd-021a-08123a000301",
    },
    WERKACAL: {
      service: "0783b03e-8535-b5a0-7140-a304d2495cb7",
      notify: "0783b03e-8535-b5a0-7140-a304d2495cb8",
      indic: "0783b03e-8535-b5a0-7140-a304d2495cba",
    },
  };
  function formatToOriginalDecimals(inputString) {

    if (isNaN(inputString)) {
      return 0;
    }
  
    

      // Parse the input string as a float
      const parsedNumber = parseFloat(inputString);
  
      // Find the number of decimal places in the input string
      const decimalIndex = inputString.indexOf(".");
      const decimalPlaces =
        decimalIndex !== -1 ? inputString.length - decimalIndex - 1 : 0;
  
      // Format the parsed number to the original number of decimal places
      const formattedNumber = parsedNumber.toFixed(decimalPlaces);
  
      // Remove trailing zeros by parsing it again as a float and then converting it to a string
      return parseFloat(formattedNumber).toString();
      
  }

  const bleConnectOptions = {
    filters: [
      { services: [SERVICES.QLR.service] },
      { services: [SERVICES.SY.service] },
      { services: [SERVICES.WERKA.service] },
      { services: [SERVICES.MT.service] },
      { services: [SERVICES.WERKACAL.service] },
      { namePrefix: "SY" },
      { namePrefix: "GR" },
    ],
  };

  console.log("BLE Connect Options", bleConnectOptions);

  const connectDevice = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice(bleConnectOptions);
      console.log("Device", device);

      const server = await device.gatt.connect();
      console.log("GATT Server connected", server);

      let service = null;
      let characteristics = null;

      for (const key in SERVICES) {
        try {
          service = await server.getPrimaryService(SERVICES[key].service);
          console.log(`Connected to ${key} service:`, service);
          characteristics = SERVICES[key];
          break;
        } catch (error) {
          console.log(
            `Service ${SERVICES[key].service} not found on this device.`
          );
        }
      }

      if (!service) {
        throw new Error("No known service found on this device.");
      }

      const notifyCharacteristic = await service.getCharacteristic(
        characteristics.notify || characteristics.char
      );
      await notifyCharacteristic.startNotifications();
      notifyCharacteristic.addEventListener(
        "characteristicvaluechanged",
        handleInd
      );

      if (characteristics.indic) {
        const indicCharacteristic = await service.getCharacteristic(
          characteristics.indic
        );
        await indicCharacteristic.startNotifications();
        indicCharacteristic.addEventListener(
          "characteristicvaluechanged",
          handleInd
        );
      }

      window.cmdCharacteristic = await service.getCharacteristic(
        characteristics.cmd || characteristics.write
      );
      window.cmdCharacteristic.addEventListener("submit", writeCommand, false);

      function handleInd(event) {
        let value = event.target.value;
        console.log("Value =", value);

        if (characteristics === SERVICES.SY || SERVICES.WERKACAL) {
          const syDecoder = new TextDecoder("utf-8");
          const syDecodedValue = syDecoder.decode(value);
          setSyDecodedString(syDecodedValue);
          console.log("Read SY value", syDecodedValue);
        } else if (characteristics === SERVICES.MT ) {
          const mtDecodedValue = mtDecoder(value);
          setMtDecodedString(mtDecodedValue);
          console.log("Read MT value", mtDecodedValue);
        } else {
          const dtDecodedValue = dtDecoder(value);
          setDtDecodedString(dtDecodedValue);
          console.log("Read DT value", dtDecodedValue);
        }
      }

      function mtDecoder(val) {
        console.log("mtDecoder echo Read value ", val);
        const dataView = new DataView(val.buffer);
        const uwaveVal =
          dataView.getInt32(3, true) / 10 ** ((dataView.getUint8(2) << 8) >> 8);
        const mtDecodedValue = uwaveVal.toString().trim();
        return mtDecodedValue;
      }

      function dtDecoder(val) {
        console.log("dtDecoder val", val);
        const sliced = [...new Uint8Array(val.buffer)];
        console.log("dtDecoder sliced", sliced);
        const v = buf2hex(val.buffer);
        console.log("dtDecoder v", v);
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
        const decodedValue = Intl.NumberFormat("en-GB", {
          signDisplay: "always",
          maximumSignificantDigits: 5,
        }).format(v1);
        console.log("dtDecoder decodedValue", decodedValue);
        return decodedValue;
      }

      function buf2hex(buffer) {
        return [...new Uint8Array(buffer)]
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("");
      }

      function isKthBitSet(n, k) {
        return (n & (1 << k)) > 0;
      }

      function kthBit(n, k) {
        return (n & (1 << k)) > 0 ? 1 : 0;
      }
    } catch (err) {
      console.error("Error", err);
    }
  };

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
  function toggleStream() {
    if (isStreaming) {
      window.cmdCharacteristic.writeValue(enc.encode("OUT0\r"));
    } else {
      window.cmdCharacteristic.writeValue(enc.encode("OUT1\r"));
    }
    setIsStreaming(!isStreaming);
  }
  function toggleBlink() {
    if (isBlinking) {
      window.cmdCharacteristic.writeValue(enc.encode( "BLI0\r"));
    } else {
      window.cmdCharacteristic.writeValue(enc.encode("BLI1\r"));
    }
    setIsBlinking(!isBlinking);
  }
  function zeroSet() {
   
      window.cmdCharacteristic.writeValue(enc.encode( "SET\r"));
  

    
  
    
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
          <p style={{ color: "green" }}>
            {formatToOriginalDecimals(syDecodedString)}
          </p>
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
        <div>


         <button  style={ { color: 'black',background: 'orange', padding: '10px', margin: '10px', width:  '100px' }} onClick={toggleStream}>{isStreaming ? 'stream off' : 'stream on'}</button>
         <button  style={ { color: 'black',background: 'orange', padding: '10px',  margin: '10px', width:  '100px'}} onClick={toggleBlink}>{isBlinking ? 'blink off' : 'blink on'}</button>
         <button  style={ { color: 'black',background: 'orange', padding: '10px',  margin: '10px', width:  '100px'}} onClick={zeroSet}>Set Zero</button>
        </div>
       
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
