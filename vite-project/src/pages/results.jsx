import { useState, useEffect } from "react";
import axios from "axios";
import { BACKEND_HOME_URL } from "../constants/urls";
import { IoMdCloudDownload } from "react-icons/io";
import { FaFileUpload } from "react-icons/fa";
import { MdDeleteForever } from "react-icons/md";
import { IoMdClose } from "react-icons/io";
import { MdOpenInNew } from "react-icons/md";
import { IoIosSearch } from "react-icons/io";
import { FaUserEdit } from "react-icons/fa";

const Results = () => {
  const [downloadError, setDownloadError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [inputState, setInputState] = useState({});
  const [selectedGender, setSelectedGender] = useState("f");
  const [searchState, setSearchState] = useState(0);
  const [responseData, setResponseData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  const onSubmit = () => {
    setSearchState(1);
    const fetch = async () => {
      const response = await axios.post(BACKEND_HOME_URL + "query", inputState);
      let lst = response.data;
      console.log(lst);
      if (lst === undefined || lst.length === 0) {
        setSearchState(404);
      } else {
        setSearchState(200);
        setResponseData(lst);
      }
    };
    console.log(inputState);
    fetch();
  };

  useEffect(() => {
    setInputState({
      ...inputState,
      gender: selectedGender,
    });
  }, [selectedGender]);

  const handleDownload = async () => {
    setDownloadError(null); // Clear previous error
    try {
      console.log("Downloading data...");
      const csvData = await axios.get(BACKEND_HOME_URL + "csv");
      const blob = new Blob([csvData.data], { type: "text/csv;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "data.csv";
      link.click();
    } catch (error) {
      console.error(error);
      setDownloadError("Download failed. Please try again.");
    }
  };

  const handleUpload = (event) => {
    setUploadError(null); // Clear previous error
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return; // Handle no file selected

    // Implement upload logic using libraries like axios or FormData
    // (placeholder for actual upload functionality)
    console.log("Uploading file...");
    const formData = new FormData();
    formData.append("file", uploadedFile);
    // Replace with actual upload endpoint (e.g., '/upload_data')
    axios
      .post(BACKEND_HOME_URL + "csv", formData)
      .then((response) => {
        console.log("Upload successful:", response.data);
        alert("Upload successful");
        // Handle successful upload on the backend
      })
      .catch((error) => {
        console.error(error);
        setUploadError("Upload failed. Please check the file format.");
      });
  };

  const handleClear = async () => {
    const res = await axios.delete(BACKEND_HOME_URL + "cleardb");
    if (res.status === 200) alert(res.data.message);
    else alert(res.data.error);
  };

  const onFormSubmit = async () => {
    const res = await axios.put( BACKEND_HOME_URL + "update", formData);
    if (res.status === 200) {
      alert(res.data.message);
      setIsEditing(false);
      setShowModal(false);
      let temp = [...responseData];
      temp[selectedPatient] = {
        name: res.data["name"],
        gender: res.data["gender"],
        diagnosis: res.data["diagnosis"],
        phone: res.data["phone"],
      };
      setResponseData(temp);
    }
    else alert(res.data.error);
  };

  const handleAddPatient = async () => {
    const res = await axios.post(BACKEND_HOME_URL + "entry", inputState);
    if (res.status === 200) {
      alert(res.data);
      setInputState({});
    }
    else alert(res.data.error);
  };

  return (
    <div className='relative m-0'>
      {/* Modal */}
      <div
        className={`z-10 backdrop-blur-[1px] w-full h-screen ${
          showModal ? "grid" : "hidden"
        } place-content-center fixed top-0 right-0`}
      >
        <div className='bg-white w-[50vw] h-[75vh] flex flex-col justify-between rounded-lg'>
          <div className='flex flex-col'>
            <div className='flex items-center justify-between p-4 w-full md:p-5 border-b rounded-t dark:border-gray-600'>
              <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>
                Patient Record for {formData["name"] ?? ""}
              </h3>
              <IoMdClose
                size={24}
                className='rounded-lg cursor-pointer text-sm w-8 h-8 inline-flex justify-center items-center'
                color='gray'
                onClick={() => setShowModal(false)}
              />
            </div>
            <div className='p-4'>
              <div className='flex justify-between items-start'>
                <div className='flex flex-col items-start justify-between'>
                  <label className='block mt-4 font-medium text-gray-700 dark:text-gray-300'>
                    Patient Name
                  </label>
                  <input
                    type='text'
                    placeholder='Enter patient name'
                    className={`block mt-2 w-full py-1.5 pr-5 text-gray-700 bg-white border ${
                      isEditing ? "border-gray-200 pl-6" : "border-transparent"
                    } rounded-lg placeholder-gray-400/70 rtl:pr-11 rtl:pl-5 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-300 focus:ring-blue-300 focus:outline-none focus:ring focus:ring-opacity-40`}
                    value={formData["name"] ?? ""}
                    readOnly={!isEditing}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        name: e.currentTarget.value,
                      });
                    }}
                  ></input>
                </div>
                <button
                  className='m-4'
                  onClick={() => setIsEditing(true)}
                  hidden={isEditing}
                >
                  <FaUserEdit className='h-6 w-6' />
                </button>
              </div>
              <div className='flex justify-between items-center w-full'>
                <div className='flex flex-col items-start justify-between'>
                  <label className='block mt-4 font-medium text-gray-700 dark:text-gray-300'>
                    Gender
                  </label>
                  <div className='inline-flex mt-2 overflow-hidden bg-white border divide-x rounded-lg dark:bg-gray-900 rtl:flex-row-reverse dark:border-gray-700 dark:divide-gray-700'>
                    <button
                      hidden={!(isEditing || formData["gender"] == "f")}
                      className={
                        formData["gender"] == "f"
                          ? "bg-gray-200 px-5 py-2 text-xs font-medium text-gray-600 transition-colors duration-200 sm:text-sm dark:bg-gray-800 dark:text-gray-300"
                          : "px-5 py-2 text-xs font-medium text-gray-600 transition-colors duration-200 sm:text-sm dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-100"
                      }
                      onClick={() => {
                        setFormData({
                          ...formData,
                          gender: "f",
                        });
                      }}
                    >
                      Female
                    </button>
                    <button
                      hidden={!(isEditing || formData["gender"] == "m")}
                      className={
                        formData["gender"] == "m"
                          ? "bg-gray-200 px-5 py-2 text-xs font-medium text-gray-600 transition-colors duration-200 sm:text-sm dark:hover:bg-gray-800 dark:text-gray-300 "
                          : "px-5 py-2 text-xs font-medium text-gray-600 transition-colors duration-200 sm:text-sm dark:hover:bg-gray-800 dark:text-gray-300 hover:bg-gray-100"
                      }
                      onClick={() => {
                        setFormData({
                          ...formData,
                          gender: "m",
                        });
                      }}
                    >
                      Male
                    </button>
                    <button
                      hidden={!(isEditing || formData["gender"] == "")}
                      className={
                        formData["gender"] == ""
                          ? "bg-gray-200 px-5 py-2 text-xs font-medium text-gray-600 transition-colors duration-200 sm:text-sm dark:hover:bg-gray-800 dark:text-gray-300"
                          : "px-5 py-2 text-xs font-medium text-gray-600 transition-colors duration-200 sm:text-sm dark:hover:bg-gray-800 dark:text-gray-300 hover:bg-gray-100"
                      }
                      onClick={() => {
                        setFormData({
                          ...formData,
                          gender: "",
                        });
                      }}
                    >
                      Rather not say
                    </button>
                  </div>
                </div>
                <div className='flex flex-col items-start justify-between'>
                  <label className='block mt-4 font-medium text-gray-700 dark:text-gray-300'>
                    Phone Number
                  </label>
                  <input
                    type='text'
                    placeholder='Enter phone number'
                    className={`block mt-2 w-full py-1.5 pr-5 text-gray-700 bg-white border ${
                      isEditing ? "border-gray-200 pl-6" : "border-transparent"
                    } rounded-lg placeholder-gray-400/70 rtl:pr-11 rtl:pl-5 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-300 focus:ring-blue-300 focus:outline-none focus:ring focus:ring-opacity-40`}
                    value={formData["phone"] ?? ""}
                    readOnly={!isEditing}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        phone: e.currentTarget.value,
                      });
                    }}
                  ></input>
                </div>
              </div>
              <label className='block mt-4 font-medium text-gray-700 dark:text-gray-300'>
                Diagnosis
              </label>
              <textarea
                placeholder='Enter diagnosis'
                rows={6}
                className={`block mt-2 w-full py-1.5 pr-5 text-gray-700 bg-white border p-2 resize-none ${
                  isEditing ? "border-gray-200" : "border-transparent"
                } rounded-lg placeholder-gray-400/70 rtl:pr-11 rtl:pl-5 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-300 focus:ring-blue-300 focus:outline-none focus:ring focus:ring-opacity-40`}
                value={formData["diagnosis"] ?? ""}
                readOnly={!isEditing}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    diagnosis: e.currentTarget.value,
                  });
                }}
              />
            </div>
          </div>
          <div
            className={`${
              isEditing ? "flex" : "hidden"
            } self-end justify-end mb-8 mr-4 gap-x-12`}
          >
            {/* cancel button */}
            <button
              className='flex items-center justify-center w-1/2 px-5 py-2 text-sm tracking-wide text-white transition-colors duration-200 bg-gray-500 rounded-lg shrink-0 sm:w-auto gap-x-2 hover:bg-gray-600 dark:hover:bg-gray-500 dark:bg-gray-600'
              onClick={() => {
                setIsEditing(false);
                setFormData(responseData[selectedPatient]);
              }}
            >
              {" "}
              Cancel{" "}
            </button>
            <button
              className='flex items-center justify-center w-1/2 px-5 py-2 text-sm tracking-wide text-white transition-colors duration-200 bg-blue-500 rounded-lg shrink-0 sm:w-auto gap-x-2 hover:bg-blue-600 dark:hover:bg-blue-500 dark:bg-blue-600'
              onClick={() => {
                onFormSubmit();
              }}
            >
              <span>{isEditing ? "Save" : "Edit"}</span>
            </button>
          </div>
        </div>
      </div>
      {/* Overlay */}
      <div
        className={`h-screen w-screen bg-black opacity-50 ${
          showModal ? "block" : "hidden"
        } fixed top-0 right-0 z-2`}
      ></div>
      {/* Wrapper  */}
      <div className='flex flex-col items-center w-screen'>
        <h1 className='my-10 w-full flex items-center justify-center shadow-md pb-6'>
          {" "}
          Medical Record Matching{" "}
        </h1>
        <div className='w-3/5'>
          <div className='sm:flex sm:items-center sm:justify-between gap-x-10'>
            <div>
              <div className='flex items-center gap-x-3'>
                <h2 className='text-lg font-medium text-gray-800 dark:text-white'>
                  Patients
                </h2>
                <span className='px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-full dark:bg-gray-800 dark:text-blue-400'>
                  {responseData.length} patients found
                </span>
              </div>
            </div>
            <div className='flex items-center gap-x-2'>
              <button
                className='flex items-center justify-center w-1/2 px-5 py-2 text-sm tracking-wide text-white transition-colors duration-200 bg-blue-500 rounded-lg shrink-0 sm:w-auto gap-x-2 hover:bg-blue-600 dark:hover:bg-blue-500 dark:bg-blue-600'
                onClick={() => {
                  handleDownload();
                }}
              >
                <IoMdCloudDownload className='w-5 h-5' />
                <span>Download</span>
              </button>
              <button className=' w-1/2 px-5 py-2 tracking-wide text-white transition-colors duration-200 bg-blue-500 rounded-lg  hover:bg-blue-600 dark:hover:bg-blue-500 dark:bg-blue-600'>
                <label
                  style={{ cursor: "pointer" }}
                  className='flex items-center justify-center shrink-0 sm:w-auto gap-x-2 text-sm'
                >
                  <FaFileUpload className='w-4 h-4' />
                  <input
                    type='file'
                    style={{ display: "none" }}
                    onChange={(e) => handleUpload(e)}
                  />
                  <span>Import</span>
                </label>
              </button>
              <button
                className='flex items-center justify-center w-1/2 px-5 py-2 text-sm tracking-wide text-white transition-colors duration-200 bg-blue-500 rounded-lg shrink-0 sm:w-auto gap-x-2 hover:bg-blue-600 dark:hover:bg-blue-500 dark:bg-blue-600'
                onClick={() => handleClear()}
              >
                <MdDeleteForever className='w-5 h-5' />
                <span>Clear</span>
              </button>
            </div>
          </div>
          <label className='block mt-6 font-medium text-gray-700 dark:text-gray-300'>
            Full Name
          </label>
          <input
            type='text'
            placeholder='Please enter your full name'
            className='block mt-2 w-full py-1.5 pr-5 text-gray-700 bg-white border border-gray-200 rounded-lg placeholder-gray-400/70 pl-11 rtl:pr-11 rtl:pl-5 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-300 focus:ring-blue-300 focus:outline-none focus:ring focus:ring-opacity-40'
            onChange={(e) => {
              setInputState({
                ...inputState,
                name: e.currentTarget.value,
              });
            }}
            value={inputState["name"] ?? ""}
          ></input>
          <label className='block mt-4 font-medium text-gray-700 dark:text-gray-300'>
            Diagnosis
          </label>
          <input
            type='text'
            placeholder='Please enter your diagnosis'
            className='block mt-2 w-full py-1.5 pr-5 text-gray-700 bg-white border border-gray-200 rounded-lg placeholder-gray-400/70 pl-11 rtl:pr-11 rtl:pl-5 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-300 focus:ring-blue-300 focus:outline-none focus:ring focus:ring-opacity-40'
            onChange={(e) => {
              setInputState({
                ...inputState,
                diagnosis: e.currentTarget.value,
              });
            }}
            value = {inputState["diagnosis"] ?? ""}
          ></input>
          <div className='mt-2 md:flex items-end justify-between '>
            <div className='md:flex items-end justify-between gap-x-4'>
              <div>
                <label className='block mt-6 font-medium text-gray-700 dark:text-gray-300'>
                  Gender
                </label>
                <div className='inline-flex overflow-hidden bg-white border divide-x rounded-lg dark:bg-gray-900 rtl:flex-row-reverse dark:border-gray-700 dark:divide-gray-700'>
                  <button
                    className={
                      selectedGender == "f"
                        ? "bg-gray-200 px-5 py-2 text-xs font-medium text-gray-600 transition-colors duration-200 sm:text-sm dark:bg-gray-800 dark:text-gray-300"
                        : "px-5 py-2 text-xs font-medium text-gray-600 transition-colors duration-200 sm:text-sm dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-100"
                    }
                    onClick={() => {
                      setSelectedGender("f");
                    }}
                  >
                    Female
                  </button>
                  <button
                    className={
                      selectedGender == "m"
                        ? "bg-gray-200 px-5 py-2 text-xs font-medium text-gray-600 transition-colors duration-200 sm:text-sm dark:hover:bg-gray-800 dark:text-gray-300 "
                        : "px-5 py-2 text-xs font-medium text-gray-600 transition-colors duration-200 sm:text-sm dark:hover:bg-gray-800 dark:text-gray-300 hover:bg-gray-100"
                    }
                    onClick={() => {
                      setSelectedGender("m");
                    }}
                  >
                    Male
                  </button>
                  <button
                    className={
                      selectedGender == ""
                        ? "bg-gray-200 px-5 py-2 text-xs font-medium text-gray-600 transition-colors duration-200 sm:text-sm dark:hover:bg-gray-800 dark:text-gray-300"
                        : "px-5 py-2 text-xs font-medium text-gray-600 transition-colors duration-200 sm:text-sm dark:hover:bg-gray-800 dark:text-gray-300 hover:bg-gray-100"
                    }
                    onClick={() => {
                      setSelectedGender("");
                    }}
                  >
                    Rather not say
                  </button>
                </div>
              </div>
              <div className='relative flex flex-col items-start mt-4 md:mt-0'>
                <label className='block mt-6 font-medium text-gray-700 dark:text-gray-300'>
                  Phone Number
                </label>
                <input
                  type='text'
                  placeholder='Enter your phone Number'
                  className='block w-full py-1.5 pr-5 text-gray-700 bg-white border border-gray-200 rounded-lg md:w-80 placeholder-gray-400/70 pl-11 rtl:pr-11 rtl:pl-5 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-300 focus:ring-blue-300 focus:outline-none focus:ring focus:ring-opacity-40'
                  onChange={(e) => {
                    setInputState({
                      ...inputState,
                      phone: e.currentTarget.value,
                    });
                  }}
                  value={inputState["phone"] ?? ""}
                ></input>
              </div>
            </div>
            <div className='md:flex items-end justify-end gap-x-4'>
              <button className='flex items-center justify-center w-1/2 px-5 py-2 text-sm tracking-wide text-white transition-colors duration-200 bg-blue-500 rounded-lg shrink-0 sm:w-auto gap-x-2 hover:bg-blue-600 dark:hover:bg-blue-500 dark:bg-blue-600' onClick={
                () => {handleAddPatient()}
              }>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth='1.5'
                  stroke='currentColor'
                  className='w-5 h-5'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
                <span>Add patient</span>
              </button>
              {/* submit button */}
              <button
                className='flex items-center justify-center w-1/2 px-5 py-2 mt-6 text-sm tracking-wide text-white transition-colors duration-200 bg-blue-500 rounded-lg sm:w-auto hover:bg-blue-600 dark:hover:bg-blue-500 dark:bg-blue-600 gap-x-2'
                onClick={() => {
                  onSubmit();
                }}
              >
                <IoIosSearch className='w-5 h-5' />
                <span>Search</span>
              </button>
            </div>
          </div>
        </div>
        <div className='flex flex-col mt-6 w-3/5'>
          <div className='-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8'>
            <div className='inline-block min-w-full py-2 align-middle md:px-6 lg:px-8'>
              <div className='overflow-hidden border border-gray-200 dark:border-gray-700 md:rounded-lg'>
                <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
                  <thead className='bg-gray-50 dark:bg-gray-800'>
                    <tr>
                      <th
                        scope='col'
                        className='py-3.5 px-4 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400'
                      >
                        <button className='flex items-center gap-x-3 focus:outline-none'>
                          <span>Name</span>
                          <svg
                            className='h-3'
                            viewBox='0 0 10 11'
                            fill='none'
                            xmlns='http://www.w3.org/2000/svg'
                          >
                            <path
                              d='M2.13347 0.0999756H2.98516L5.01902 4.79058H3.86226L3.45549 3.79907H1.63772L1.24366 4.79058H0.0996094L2.13347 0.0999756ZM2.54025 1.46012L1.96822 2.92196H3.11227L2.54025 1.46012Z'
                              fill='currentColor'
                              stroke='currentColor'
                              strokeWidth='0.1'
                            />
                            <path
                              d='M0.722656 9.60832L3.09974 6.78633H0.811638V5.87109H4.35819V6.78633L2.01925 9.60832H4.43446V10.5617H0.722656V9.60832Z'
                              fill='currentColor'
                              stroke='currentColor'
                              strokeWidth='0.1'
                            />
                            <path
                              d='M8.45558 7.25664V7.40664H8.60558H9.66065C9.72481 7.40664 9.74667 7.42274 9.75141 7.42691C9.75148 7.42808 9.75146 7.42993 9.75116 7.43262C9.75001 7.44265 9.74458 7.46304 9.72525 7.49314C9.72522 7.4932 9.72518 7.49326 9.72514 7.49332L7.86959 10.3529L7.86924 10.3534C7.83227 10.4109 7.79863 10.418 7.78568 10.418C7.77272 10.418 7.73908 10.4109 7.70211 10.3534L7.70177 10.3529L5.84621 7.49332C5.84617 7.49325 5.84612 7.49318 5.84608 7.49311C5.82677 7.46302 5.82135 7.44264 5.8202 7.43262C5.81989 7.42993 5.81987 7.42808 5.81994 7.42691C5.82469 7.42274 5.84655 7.40664 5.91071 7.40664H6.96578H7.11578V7.25664V0.633865C7.11578 0.42434 7.29014 0.249976 7.49967 0.249976H8.07169C8.28121 0.249976 8.45558 0.42434 8.45558 0.633865V7.25664Z'
                              fill='currentColor'
                              stroke='currentColor'
                              strokeWidth='0.3'
                            />
                          </svg>
                        </button>
                      </th>
                      <th
                        scope='col'
                        className='px-12 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400'
                      >
                        Gender
                      </th>
                      <th
                        scope='col'
                        className='px-4 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400'
                      >
                        Diagnosis
                      </th>
                      <th
                        scope='col'
                        className='px-4 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400'
                      >
                        Phone Number
                      </th>
                      <th scope='col' className='relative py-3.5 px-4'>
                        <span className='sr-only'>Edit</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-900'>
                    {searchState === 200 &&
                      responseData.map((data, idx) => {
                        return (
                          <tr key={idx}>
                            <td className='px-4 py-4 text-sm font-medium whitespace-nowrap'>
                              <div>
                                <p className='font-medium text-gray-600 dark:text-white '>
                                  {data["name"]}
                                </p>
                              </div>
                            </td>
                            <td className='px-12 py-4 text-sm font-medium whitespace-nowrap'>
                              <div className='inline px-3 py-1 text-sm font-normal rounded-full text-emerald-500 gap-x-2 bg-emerald-100/60 dark:bg-gray-800'>
                                {data["gender"]}
                              </div>
                            </td>
                            <td className='px-4 py-4 text-sm whitespace-nowrap'>
                              <div>
                                <p className='text-gray-500 dark:text-gray-400'>
                                  {data["diagnosis"].length > 50
                                    ? data["diagnosis"].substring(0, 50) + "..."
                                    : data["diagnosis"]}
                                </p>
                              </div>
                            </td>
                            <td className='px-4 py-4 text-sm whitespace-nowrap'>
                              {data["phone"]}
                            </td>
                            <td className='px-4 py-4 text-sm whitespace-nowrap'>
                              <button
                                className='px-1 py-1 text-gray-500 transition-colors duration-200 dark:text-gray-300 hover:bg-gray-100'
                                onClick={() => {
                                  setShowModal(true);
                                  setSelectedPatient(idx);
                                  setIsEditing(false);
                                  setFormData(data);
                                }}
                              >
                                <MdOpenInNew />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    {searchState === 404 && (
                      <tr>
                        <td
                          colSpan='5'
                          className='px-4 py-4 text-sm font-medium text-gray-500 dark:text-gray-400'
                        >
                          No results found
                        </td>
                      </tr>
                    )}
                    {searchState === 1 && (
                      <tr>
                        <td
                          colSpan='5'
                          className='px-4 py-4 text-sm font-medium text-gray-500 dark:text-gray-400'
                        >
                          Loading...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className='mt-6 sm:flex w-3/5 sm:items-center sm:justify-between mb-12'>
          <div className='text-sm text-gray-500 dark:text-gray-400'>
            Page{" "}
            <span className='font-medium text-gray-700 dark:text-gray-100'>
              1 of 1
            </span>
          </div>
          <div className='flex items-center mt-4 gap-x-4 sm:mt-0'>
            <a
              href='#'
              className='flex items-center justify-center w-1/2 px-5 py-2 text-sm text-gray-700 capitalize transition-colors duration-200 bg-white border rounded-md sm:w-auto gap-x-2 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth='1.5'
                stroke='currentColor'
                className='w-5 h-5 rtl:-scale-x-100'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M6.75 15.75L3 12m0 0l3.75-3.75M3 12h18'
                />
              </svg>
              <span>previous</span>
            </a>
            <a
              href='#'
              className='flex items-center justify-center w-1/2 px-5 py-2 text-sm text-gray-700 capitalize transition-colors duration-200 bg-white border rounded-md sm:w-auto gap-x-2 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800'
            >
              <span>Next</span>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth='1.5'
                stroke='currentColor'
                className='w-5 h-5 rtl:-scale-x-100'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3'
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
