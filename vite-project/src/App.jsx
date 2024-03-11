import { useState } from 'react'
import axios from 'axios';
import { BACKEND_HOME_URL } from './constants/urls';
import { IoMdCloudDownload } from "react-icons/io";
import { FaFileUpload } from "react-icons/fa";
import { MdDeleteForever } from "react-icons/md";



function App() {
  const [inputState, setInputState] = useState("");
  const [searchState, setSearchState] = useState(0);
  const [responseData, setResponseData] = useState([]);
  const [downloadError, setDownloadError] = useState(null);
  const [uploadError, setUploadError] = useState(null);


  const onSubmit = () => {
    setSearchState(1)
    const fetch = async () => {
      const response = await axios.post(BACKEND_HOME_URL + 'query', {
        query: inputState
      });
      let lst = response.data;
      console.log(lst)
      if (lst === undefined || lst.length === 0) {
        setSearchState(404);
      }
      else {
        setSearchState(200);
        setResponseData(lst);
      }
    }
    fetch();
  }

  const handleDownload = async () => {
    setDownloadError(null); // Clear previous error
    try {
      console.log('Downloading data...');
      const csvData = await axios.get(BACKEND_HOME_URL + "csv");
      const blob = new Blob([csvData.data], { type: 'text/csv;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'data.csv';
      link.click();
    } catch (error) {
      console.error(error);
      setDownloadError('Download failed. Please try again.');
    }
  };

  const handleUpload = (event) => {
    setUploadError(null); // Clear previous error
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return; // Handle no file selected

    // Implement upload logic using libraries like axios or FormData
    // (placeholder for actual upload functionality)
    console.log('Uploading file...');
    const formData = new FormData();
    formData.append('file', uploadedFile);
    // Replace with actual upload endpoint (e.g., '/upload_data')
    axios.post(BACKEND_HOME_URL + 'csv', formData)
      .then((response) => {
        console.log('Upload successful:', response.data);
        // Handle successful upload on the backend
      })
      .catch((error) => {
        console.error(error);
        setUploadError('Upload failed. Please check the file format.');
      });
  };

  const handleClear = async () => {
    const res = await axios.get(BACKEND_HOME_URL + "cleardb");
    if (res.status === 200) alert(res.data.message)
    else alert(res.data.error)
  }

  return (
    <>
      <div style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        placeContent: "center",
        placeSelf: "center",
        alignItems: "center",
        gap: "1rem"
      }}>
        <input type='text' placeholder='Enter your search name' style={{
          width: "30rem",
          padding: "1rem"
        }} onChange={(e) => {
          setInputState(e.currentTarget.value);
        }}></input>
        <button style={{
          width: "10rem"
        }} onClick={(e) => { onSubmit() }}>Submit</button>
        <div>{searchState === 0 ? "Search Something" : (searchState === 1 ? "Loading" : (searchState === 404 ? "No results found." : <>
          <div>
            <ol>
              {responseData.map((el, idx) => {
                return <li key={idx}>{el}</li>
              })}
            </ol>
          </div>
        </>))}</div>
      </div>

      <div style={{
        position: "absolute",
        backgroundColor: "white",
        padding: "1rem",
        bottom: "0",
        right: "0",
        marginRight: "10rem",
        marginBottom: "10rem"
      }}>
        {/* <label>
          <IoMdCloudDownload />
          <input type="file" style={{ display: "none" }} onChange={(e) => handleUpload(e)} />
        </label> */}
        <button onClick={(e) => { handleDownload() }}>
          <IoMdCloudDownload />
        </button>
        <button>
          <label style={{ cursor: "pointer" }}>
            <FaFileUpload />
            <input type="file" style={{ display: "none" }} onChange={(e) => handleUpload(e)} />
          </label>
        </button>
        <button onClick={(e) => handleClear()}>
          <MdDeleteForever />
        </button>
      </div>
    </>
  )
}

export default App

