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
        toggleVisibility('inputFields', false) 
        const days = parseInt(document.getElementById('days').value);
        plotHandler(days);
        daysEventHandler();
    } else {
        toggleVisibility('googleFit', false)
        toggleVisibility('logOut', true)
        toggleVisibility('inputFields', true)
    }
}

const daysEventHandler = () => {
    document.getElementById('days').addEventListener('change', () => {
        const days = parseInt(document.getElementById('days').value);
        plotHandler(days);
    })
}

const plotHandler = (days) => {
    getAllDataSources()
    // createDataSource()
    const request = gapi.client.request({
        'method': 'POST',
        'path': '/fitness/v1/users/me/dataset:aggregate',
        'body': JSON.stringify({    
            'aggregateBy' : [{    
                'dataSourceId': 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'    
            }],
            'bucketByTime': { 'durationMillis': 86400000 },
            'startTimeMillis': new Date(new Date().getTime() - ((days-1)*86400000)).setHours(0,0,0,0), 
            'endTimeMillis': new Date().getTime() 
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
            type: 'scatter', 
            type2: 'bar',
            id: 'plot',
            title: `Last ${days} days step counts (total - ${y.reduce((a,b) => a+b)})`
        })
    });
        
}

const renderPlotlyCHart = (obj) => {
    const data = [
        {
            x: obj.x,
            y: obj.y,
            type: obj.type
        },
        {
            x: obj.x,
            y: obj.y,
            type: obj.type2,
            marker: {
                color: 'rgb(49,130,189)',
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
            navigator.serviceWorker.register('./fit/serviceWorker.js')
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
