let isAuthorized;
let currentApiRequest;
let GoogleAuth; // Google Auth object.

const scope = 'https://www.googleapis.com/auth/fitness.activity.read';

const initClient = () => {
    gapi.client.init({
        'apiKey': 'AIzaSyDe3Ewzl4x7hEX30EiQJ0tvXBtzd2Hghiw',
        'clientId': '1061219778575-6m60p9cvbgo8ga7r2042e43oudvjd8mj.apps.googleusercontent.com',
        'scope': scope
    }).then(function () {
        GoogleAuth = gapi.auth2.getAuthInstance();
        GoogleAuth.isSignedIn.listen(setSigninStatus);
        const signedIn = GoogleAuth.isSignedIn.get();
        if(signedIn) setSigninStatus();
    });
}

const handleAuthClick = () => {
    if (GoogleAuth.isSignedIn.get()) {
        GoogleAuth.signOut();
        location.reload();
    } else {
        GoogleAuth.signIn();
    }
}

const revokeAccess = () => {
    GoogleAuth.disconnect();
}

const setSigninStatus = () => {
    const user = GoogleAuth.currentUser.get();
    const isAuthorized = user.hasGrantedScopes(scope);
    if (isAuthorized) {
        handleGeoLocation();
        toggleVisibility('googleFit', true)
        toggleVisibility('logOut', false)
        toggleVisibility('inputFields', false);
        const currentDate = new Date();
        const date = new Date();
        date.setDate(date.getDate() - 89);
        const formattedDate = `${date.getFullYear()}-${date.getMonth()+1 < 10 ? '0': ''}${date.getMonth()+1}-${date.getDate() < 10 ? '0': ''}${date.getDate()}T00:00`

        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() - 6);
        const defaultFormattedDate = `${defaultDate.getFullYear()}-${defaultDate.getMonth()+1 < 10 ? '0': ''}${defaultDate.getMonth()+1}-${defaultDate.getDate() < 10 ? '0': ''}${defaultDate.getDate()}T00:00`

        const dateInputFrom = document.createElement('input');
        dateInputFrom.id = 'dateRange';
        dateInputFrom.type = 'datetime-local';
        dateInputFrom.min = formattedDate;
        dateInputFrom.max = `${currentDate.getFullYear()}-${currentDate.getMonth()+1 < 10 ? '0': ''}${currentDate.getMonth()+1}-${currentDate.getDate() < 10 ? '0': ''}${currentDate.getDate()}T${currentDate.getHours() < 10 ? '0': ''}${currentDate.getHours()}:${currentDate.getMinutes() < 10 ? '0': ''}${currentDate.getMinutes()}`;
        dateInputFrom.value = defaultFormattedDate;
        dateInputFrom.classList = ['appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'];

        const dateLabelFrom = document.createElement('label');
        dateLabelFrom.for = 'dateRange';
        dateLabelFrom.classList = ['block text-gray-700 text-sm font-bold mb-2'];
        dateLabelFrom.innerHTML = 'from:';

        document.getElementById('dateRangeDiv').appendChild(dateLabelFrom)
        document.getElementById('dateRangeDiv').appendChild(dateInputFrom)

        const dateInputTo = document.createElement('input');
        dateInputTo.id = 'dateRangeTo';
        dateInputTo.type = 'datetime-local';
        dateInputTo.value = `${currentDate.getFullYear()}-${currentDate.getMonth()+1 < 10 ? '0': ''}${currentDate.getMonth()+1}-${currentDate.getDate() < 10 ? '0': ''}${currentDate.getDate()}T${currentDate.getHours() < 10 ? '0': ''}${currentDate.getHours()}:${currentDate.getMinutes() < 10 ? '0': ''}${currentDate.getMinutes()}`
        dateInputTo.classList = ['appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'];

        const dateLabelTo = document.createElement('label');
        dateLabelTo.for = 'dateRange';
        dateLabelTo.classList = ['block text-gray-700 text-sm font-bold mb-2'];
        dateLabelTo.innerHTML = 'to:';

        document.getElementById('dateRangeDiv').appendChild(dateLabelTo)
        document.getElementById('dateRangeDiv').appendChild(dateInputTo)

        const dateRangeStart = new Date(document.getElementById('dateRange').value).getTime()
        const dateRangeEnd = new Date(document.getElementById('dateRangeTo').value).getTime();

        plotHandler(dateRangeStart, dateRangeEnd);
        daysEventHandler();
    } else {
        toggleVisibility('googleFit', false)
        toggleVisibility('logOut', true)
        toggleVisibility('inputFields', true)
    }
}

const daysEventHandler = () => {
    document.getElementById('dateRange').addEventListener('change', () => {
        const dateRangeStart = new Date(document.getElementById('dateRange').value).getTime()
        const dateRangeEnd = new Date(document.getElementById('dateRangeTo').value).getTime();
        plotHandler(dateRangeStart, dateRangeEnd);
    })
    document.getElementById('dateRangeTo').addEventListener('change', () => {
        const dateRangeStart = new Date(document.getElementById('dateRange').value).getTime()
        const dateRangeEnd = new Date(document.getElementById('dateRangeTo').value).getTime();
        plotHandler(dateRangeStart, dateRangeEnd);
    })
}

const plotHandler = (dateRangeStart, dateRangeEnd) => {
    getAllDataSources()
    getDataSetBySourceId('com.google.heart_minutes', dateRangeStart, dateRangeEnd);
    // createDataSource()
    const request = gapi.client.request({
        'method': 'POST',
        'path': '/fitness/v1/users/me/dataset:aggregate',
        'body': JSON.stringify({    
            'aggregateBy' : [{    
                'dataSourceId': 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'    
            }],
            'bucketByTime': { 'durationMillis': 86400000 },
            'startTimeMillis': dateRangeStart, 
            'endTimeMillis': dateRangeEnd
        })
    });

    request.execute((steps) => {
        if(steps.error) {
            document.getElementById('plot').innerHTML = steps.error.message;
            return;
        }
        const x = steps.bucket.map(dt => `${new Date(parseInt(dt.startTimeMillis)).getMonth() + 1}/${new Date(parseInt(dt.startTimeMillis)).getDate()}/${new Date(parseInt(dt.startTimeMillis)).getFullYear()}`);
        const y = steps.bucket.map(dt =>dt.dataset[0]).map(dt => dt.point && dt.point[0] ? dt.point[0] : 0).map(dt => dt.value && dt.value[0] ? dt.value[0] : 0).map(dt => dt.intVal ? dt.intVal : 0)
        renderPlotlyCHart({
            x, 
            y,
            type: 'bar',
            id: 'plot',
            title: `Step counts #${y.reduce((a,b) => a+b)}`
        }, 'rgb(49,130,189)')
    });  
}

const getDataSetBySourceId = (dataTypeName, dateRangeStart, dateRangeEnd) => {
    const request = gapi.client.request({
        'method': 'POST',
        'path': '/fitness/v1/users/me/dataset:aggregate',
        'body': JSON.stringify({    
            'aggregateBy' : [{
                'dataTypeName': dataTypeName
            }],
            'bucketByTime': { 'durationMillis': 86400000 },
            'startTimeMillis': dateRangeStart,
            'endTimeMillis': dateRangeEnd
        })
    });
    request.execute((data) => {
        if(data.error) {
            document.getElementById('plot2').innerHTML = steps.error.message;
            return;
        }
        dataProcessor(data, dateRangeStart, dateRangeEnd);
    })
}

const dataProcessor = (data) => {
    const x = data.bucket.map(dt => `${new Date(parseInt(dt.startTimeMillis)).getMonth() + 1}/${new Date(parseInt(dt.startTimeMillis)).getDate()}/${new Date(parseInt(dt.startTimeMillis)).getFullYear()}`);
    const y = data.bucket.map(dt => dt.dataset[0]).map(dt => dt.point && dt.point[0] ? dt.point[0] : 0).map(dt => dt.value && dt.value[0] ? dt.value[0] : 0).map(dt => dt.fpVal ? dt.fpVal : 0)
    renderPlotlyCHart({
        x, 
        y,
        type: 'scatter',
        id: 'plot2',
        title: `Heart points #${y.reduce((a,b) => a+b)}`
    }, 'rgb(246,178,107)')
}

const renderPlotlyCHart = (obj, color) => {
    const data = [
        {
            x: obj.x,
            y: obj.y,
            type: obj.type,
            marker: {
                color: color,
                opacity: 0.4,
            }
        }
        
    ];
    const layout = {
        title: obj.title,
        xaxis: {
            tickangle: -45
        }
    };
    Plotly.newPlot(obj.id, data, layout, {responsive: true, displayModeBar: false});
}

const getAllDataSources = () => {
    const request = gapi.client.request({
        'method': 'GET',
        'path': '/fitness/v1/users/me/dataSources/'
    });

    request.execute((response) => {
        console.log(response.dataSource)
    });
}

const createDataSource = () => {
    const request = gapi.client.request({
        'method': 'POST',
        'path': '/fitness/v1/users/me/dataSources/',
        'body': JSON.stringify({    
           'application': {
               'name': 'GPS'
           },
           'dataType': {
               'field': [
                    {
                        'format': 'floatPoint',
                        'name': 'lat'
                    },
                    {
                        'format': 'floatPoint',
                        'name': 'lng'
                    }
               ],
               'name': ''
           },
           'device': {
                'manufacturer': window.navigator.vendor,
                'model': window.navigator.userAgentData.brands[0].brand,
                'type': 'phone',
                'uid': window.navigator.productSub,
                'version': window.navigator.userAgentData.brands[0].version
            },
            'type': 'raw'
        })
    });

    request.execute((response) => {
        console.log(response.dataSource)
    });
}

const handleSignIn = () => {
    if('serviceWorker' in navigator){
        try {
            navigator.serviceWorker.register('./serviceWorker.js')
            .then((registration) => {
            });
        }
        catch (error) {
            console.log(error);
        }
    }
    gapi.load('client', initClient);
    document.getElementById('googleFit').addEventListener('click', () => {
        handleAuthClick();
    })
    document.getElementById('logOut').addEventListener('click', () => {
        handleAuthClick();
    })
}

const toggleVisibility = (id, hide) => {
    if (hide) {
        document.getElementById(id).classList.add('hidden');
    }
    else {
        document.getElementById(id).classList.remove('hidden');
    }
}

const handleGeoLocation = () => {
    if (navigator.geolocation) {
        document.getElementById('address').innerHTML = 'Getting location ...';
        navigator.geolocation.getCurrentPosition(async position => {
            let geolocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            const geocoder = new google.maps.Geocoder();
            const response = await geocoder.geocode({ location: geolocation });
            if(response.results.length > 0 ){
                document.getElementById('address').innerHTML = `Current location - ${response.results[0].formatted_address} </br> latitude: ${geolocation.lat} </br> longitude: ${geolocation.lng} </br> Accuracy: ${position.coords.accuracy} meters`
            }
        });
    }
}

window.onload = () => {
    handleSignIn()
}
