import { useState } from 'react'
import axios from 'axios';
import { BACKEND_HOME_URL } from './constants/urls';
import { IoMdCloudDownload } from "react-icons/io";


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
      else{
        setSearchState(200);
        setResponseData(lst);
      }
    }
    fetch();
  }
 
  const handleDownload = async () => {
    setDownloadError(null); // Clear previous error
    try {
      axios.get(BACKEND_HOME_URL + "csv");
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
    axios.post(BACKEND_HOME_URL + 'upload', formData)
      .then((response) => {
        console.log('Upload successful:', response.data);
        // Handle successful upload on the backend
      })
      .catch((error) => {
        console.error(error);
        setUploadError('Upload failed. Please check the file format.');
      });
  };

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
          {responseData.map((el, idx)=>{
            return <li key={idx}>{el}</li>
          })}
          </ol>
          </div>
        </>)) }</div>
      </div>

      <div style={{
        position: "absolute",
        bottom: "0",
        right: "0",
        marginRight: "10rem",
        marginBottom: "10rem"
      }}>
        <IoMdCloudDownload onClick={(e)=>{handleDownload()}} />
      </div>
    </>
  )
}

export default App
