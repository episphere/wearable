let isAuthorized;
let currentApiRequest;

const googleFit = async () => {
    let parameters = getparameters(decodeURIComponent(window.location.hash.replace('#','')))
    if(parameters.token_type === 'Bearer' || (localStorage.googleFit && JSON.parse(localStorage.googleFit).access_token)){
        document.getElementById('googleFit').hidden = true;
        document.getElementById('logOut').hidden = false;
        handleLogOut();
        if(!localStorage.googleFit || JSON.parse(localStorage.googleFit).access_token === undefined) localStorage.googleFit = JSON.stringify(parameters);
        const access_token = parameters.access_token ? parameters.access_token : JSON.parse(localStorage.googleFit).access_token;
        
        const steps = await getUsersDataSet(access_token, 7);
        if(steps.error) {
            document.getElementById('plot').innerHTML = steps.error.message;
            return;
        }
        const x = steps.bucket.map(dt => new Date(parseInt(dt.startTimeMillis)).toDateString());
        const y = steps.bucket.map(dt =>dt.dataset[0]).map(dt => dt.point[0]).map(dt => dt.value[0]).map(dt => dt.intVal)
        renderPlotlyCHart({
            x, 
            y, 
            type: 'bar', 
            id: 'plot',
            title: 'Last 7 days step counts'
        })
        return;
    }
    document.getElementById('googleFit').hidden = false;
    document.getElementById('logOut').hidden = true;
    
    handleSignIn();
}

const renderPlotlyCHart = (obj) => {
    const data = [
        {
          x: obj.x,
          y: obj.y,
          type: obj.type
        }
    ];
    const layout = {
        title: obj.title,
    };
    Plotly.newPlot(obj.id, data, layout);
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
            "endTimeMillis": 1623431882198 
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
            'clientId': '433406250563-mqbdjom6r2brjsd868dfi7lcd4kp8i0c.apps.googleusercontent.com',
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
        location.href = window.location.origin+'/fit/';
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


window.onload = () => {
    googleFit()
}
