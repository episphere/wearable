let isAuthorized;
let currentApiRequest;

const googleFit = () => {
    let parameters = getparameters(decodeURIComponent(window.location.hash.replace('#','')))
    if(parameters.token_type === 'Bearer' || (localStorage.googleFit && JSON.parse(localStorage.googleFit).access_token)){
        handleGeoLocation();
        toggleVisibility('googleFit', true)
        toggleVisibility('logOut', false)
        toggleVisibility('inputFields', false)

        handleLogOut();
        if(!localStorage.googleFit) localStorage.googleFit = JSON.stringify(parameters);
        window.history.replaceState({},'', './');        
        const days = parseInt(document.getElementById('days').value);
        const access_token = parameters.access_token ? parameters.access_token : JSON.parse(localStorage.googleFit).access_token;
        plotHandler(days, access_token);
        daysEventHandler(access_token);
    }else{
        toggleVisibility('googleFit', false)
        toggleVisibility('logOut', true)
        toggleVisibility('inputFields', true)
    }
    
    handleSignIn();
}

const daysEventHandler = (access_token) => {
    document.getElementById('days').addEventListener('change', () => {
        const days = parseInt(document.getElementById('days').value);
        plotHandler(days, access_token);
    })
}

const plotHandler = async (days, access_token) => {
    const steps = await getUsersDataSet(access_token, days);
        if(steps.error) {
            document.getElementById('plot').innerHTML = steps.error.message;
            return;
        }
        const x = steps.bucket.map(dt => new Date(parseInt(dt.startTimeMillis)).toDateString());
        const y = steps.bucket.map(dt =>dt.dataset[0]).map(dt => dt.point && dt.point[0] ? dt.point[0] : 0).map(dt => dt.value && dt.value[0] ? dt.value[0] : 0).map(dt => dt.intVal ? dt.intVal : 0)
        renderPlotlyCHart({
            x, 
            y, 
            type: 'scatter', 
            type2: 'bar',
            id: 'plot',
            title: `Last ${days} days step counts (total - ${y.reduce((a,b) => a+b)})`
        })
        return;
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
            type: obj.type2
        }
        
    ];
    const layout = {
        title: obj.title,
    };
    Plotly.newPlot(obj.id, data, layout, {responsive: true, displayModeBar: false});
}

const getAllDataSources = async (access_token) => {
    const response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataSources/', {
        method:'GET',
        headers:{
            Authorization:`Bearer ${access_token}`
        }
    })
    return await response.json();
}

const getUsersDataSet = async (access_token, days) => {
    console.log(await getAllDataSources(access_token))
    const response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
        method:'POST',
        headers:{
            Authorization:`Bearer ${access_token}`
        },
        body: JSON.stringify({    
            "aggregateBy" : [{    
                "dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"    
            }],
            "bucketByTime": { "durationMillis": 86400000 },
            "startTimeMillis": new Date(new Date().getTime() - ((days-1)*86400000)).setHours(0,0,0,0), 
            "endTimeMillis": new Date().getTime() 
        })
    })
    return await response.json();
}

const handleSignIn = () => {
    document.getElementById('googleFit').addEventListener('click', () => {
        const redirect_uri = window.location;
        let config = {
            redirect_uri,
            'oauth2Endpoint': 'https://accounts.google.com/o/oauth2/v2/auth',
            'clientId': '1061219778575-6m60p9cvbgo8ga7r2042e43oudvjd8mj.apps.googleusercontent.com',
            'response_type': 'token',
            'include_granted_scopes': 'true',
            'state': 'pass-through value',
            'scope': ['https://www.googleapis.com/auth/fitness.activity.read']
        }
        oauthSignIn(config);
    })
}

const handleLogOut = () => {
    document.getElementById('logOut').addEventListener('click', () => {
        delete localStorage.googleFit;
        location.reload();
    })
}

const oauthSignIn = (config) => {
    const url = `${config.oauth2Endpoint}?client_id=${config.clientId}&redirect_uri=${config.redirect_uri}&response_type=${config.response_type}&scope=${config.scope.join(' ')}`
    location.href = url;
}

const getparameters = (query) => {
    const array = query.split('&');
    let obj = {};
    array.forEach(value => {
        obj[value.split('=')[0]] = value.split('=')[1];
    });
    return obj;
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
                document.getElementById('address').innerHTML = `Current address - ${response.results[0].formatted_address}`
            }
        });
    }
}

window.onload = () => {
    googleFit()
}
