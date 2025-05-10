document.addEventListener('DOMContentLoaded', function() {
    // Hero Slider
    const heroSlides = document.querySelectorAll('.slide');
    const slidePrevBtn = document.querySelector('.arrow.prev');
    const slideNextBtn = document.querySelector('.arrow.next');
    let currentSlide = 0;
    
    // Set interval for automatic slide change
    const slideInterval = setInterval(nextSlide, 6000);
    
    function nextSlide() {
        heroSlides[currentSlide].classList.remove('current');
        currentSlide = (currentSlide + 1) % heroSlides.length;
        heroSlides[currentSlide].classList.add('current');
        updateDots();
    }
    
    function prevSlide() {
        heroSlides[currentSlide].classList.remove('current');
        currentSlide = (currentSlide - 1 + heroSlides.length) % heroSlides.length;
        heroSlides[currentSlide].classList.add('current');
        updateDots();
    }
    
    // Event listeners for manual navigation
    slidePrevBtn.addEventListener('click', function() {
        clearInterval(slideInterval);
        prevSlide();
        updateDots();
    });
    
    slideNextBtn.addEventListener('click', function() {
        clearInterval(slideInterval);
        nextSlide();
        updateDots();
    });
    
    // Slide dots navigation
    const slideDots = document.querySelectorAll('.dot');
    
    // Function to update active dot
    function updateDots() {
        slideDots.forEach((dot, index) => {
            if (index === currentSlide) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
    
    // Click event for dots
    slideDots.forEach((dot, index) => {
        dot.addEventListener('click', function() {
            clearInterval(slideInterval);
            heroSlides[currentSlide].classList.remove('current');
            currentSlide = index;
            heroSlides[currentSlide].classList.add('current');
            updateDots();
        });
    });
    // Initialize variables
    const audioPlayer = new Audio();
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const progressBar = document.querySelector('.progress-bar');
    const progressContainer = document.querySelector('.progress-container');
    const nowPlayingText = document.querySelector('.now-playing .song-title');
    const playlistContainer = document.getElementById('audio-playlist');
    
    let currentTrackIndex = 0;
    let isPlaying = false;
    let tracks = [];
    let trackData = [];
    
    // Function to fetch and load audio files
    function loadAudioFiles() {
        // Load playlist from JSON file (this approach works well for static sites)
        fetch('audio/playlist.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Clear existing playlist
                playlistContainer.innerHTML = '';
                trackData = [];
                
                // Process tracks from JSON
                if (data.tracks && Array.isArray(data.tracks)) {
                    data.tracks.forEach((track, index) => {
                        // Create track element
                        const trackElement = document.createElement('div');
                        trackElement.className = 'track';
                        trackElement.setAttribute('data-src', `audio/${track.file}`);
                        trackElement.innerHTML = `
                            <div class="track-info">
                                <h3>${track.title}</h3>
                                <p>${track.venue} - ${track.date}</p>
                            </div>
                            <button class="play-btn"><i class="ti ti-player-play"></i></button>
                        `;
                        
                        // Add to the playlist container
                        playlistContainer.appendChild(trackElement);
                        
                        // Store track data
                        trackData.push({
                            src: `audio/${track.file}`,
                            title: track.title,
                            info: `${track.venue} - ${track.date}`
                        });
                    });
                }
                
                // Update tracks array with newly created elements
                tracks = document.querySelectorAll('.track');
                
                // Add click events to the new track elements
                tracks.forEach(track => {
                    track.addEventListener('click', function() {
                        const index = Array.from(tracks).indexOf(this);
                        loadTrack(index);
                        playTrack();
                    });
                });
            })
            .catch(error => {
                console.error('Error loading playlist:', error);
                
                // Fallback to hardcoded list if JSON fetch fails
                const audioFiles = [
                    'Blister in the Sun - Progression Brewery 6-8-24.m4a',
                    'Lips Like Sugar - Progression Brewery 6-8-24.m4a',
                    'Message to You Rudy - Progression Brewery 6-8-24.m4a',
                    'Pulling Mussels from the Shell - Progression Brewery 6:8:24.m4a'
                ];
                
                // Clear existing playlist
                playlistContainer.innerHTML = '';
                trackData = [];
                
                // Create track elements from hardcoded list
                audioFiles.forEach((file, index) => {
                    // Extract the song title (remove file extension and venue/date info)
                    let songTitle = file.split(' - ')[0];
                    let venue = file.split(' - ')[1] ? file.split(' - ')[1].replace(/\.[^/.]+$/, '') : '';
                    
                    // Create track element
                    const trackElement = document.createElement('div');
                    trackElement.className = 'track';
                    trackElement.setAttribute('data-src', `audio/${file}`);
                    trackElement.innerHTML = `
                        <div class="track-info">
                            <h3>${songTitle}</h3>
                            <p>${venue}</p>
                        </div>
                        <button class="play-btn"><i class="ti ti-player-play"></i></button>
                    `;
                    
                    // Add to the playlist container
                    playlistContainer.appendChild(trackElement);
                    
                    // Store track data
                    trackData.push({
                        src: `audio/${file}`,
                        title: songTitle,
                        info: venue
                    });
                });
                
                // Update tracks array with newly created elements
                tracks = document.querySelectorAll('.track');
                
                // Add click events to the new track elements
                tracks.forEach(track => {
                    track.addEventListener('click', function() {
                        const index = Array.from(tracks).indexOf(this);
                        loadTrack(index);
                        playTrack();
                    });
                });
            });
    }
    
    // Load audio files when the page loads
    loadAudioFiles();
    
    // Load track function
    function loadTrack(index) {
        currentTrackIndex = index;
        
        // Update active track styling
        tracks.forEach(track => track.classList.remove('active'));
        tracks[index].classList.add('active');
        
        // Update audio source
        audioPlayer.src = trackData[index].src;
        
        // Update now playing text
        nowPlayingText.textContent = trackData[index].title;
    }
    
    // Play track function
    function playTrack() {
        audioPlayer.play();
        isPlaying = true;
        updatePlayPauseIcon();
    }
    
    // Pause track function
    function pauseTrack() {
        audioPlayer.pause();
        isPlaying = false;
        updatePlayPauseIcon();
    }
    
    // Update play/pause button icon
    function updatePlayPauseIcon() {
        playPauseBtn.innerHTML = isPlaying 
            ? '<i class="ti ti-player-pause"></i>' 
            : '<i class="ti ti-player-play"></i>';
        
        // Update individual track play buttons
        tracks.forEach((track, index) => {
            const trackPlayBtn = track.querySelector('.play-btn');
            if (index === currentTrackIndex && isPlaying) {
                trackPlayBtn.innerHTML = '<i class="ti ti-player-pause"></i>';
            } else {
                trackPlayBtn.innerHTML = '<i class="ti ti-player-play"></i>';
            }
        });
    }
    
    // Previous track function
    function prevTrack() {
        currentTrackIndex = (currentTrackIndex - 1 + trackData.length) % trackData.length;
        loadTrack(currentTrackIndex);
        if (isPlaying) playTrack();
    }
    
    // Next track function
    function nextTrack() {
        currentTrackIndex = (currentTrackIndex + 1) % trackData.length;
        loadTrack(currentTrackIndex);
        if (isPlaying) playTrack();
    }
    
    // Event listeners
    playPauseBtn.addEventListener('click', function() {
        if (isPlaying) {
            pauseTrack();
        } else {
            // If no track is loaded, load the first one
            if (!audioPlayer.src || audioPlayer.src === '') {
                loadTrack(0);
            }
            playTrack();
        }
    });
    
    prevBtn.addEventListener('click', prevTrack);
    nextBtn.addEventListener('click', nextTrack);
    
    // Progress bar update
    audioPlayer.addEventListener('timeupdate', function() {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.style.width = progress + '%';
    });
    
    // Click on progress bar to seek
    progressContainer.addEventListener('click', function(e) {
        const clickPosition = (e.offsetX / this.offsetWidth);
        const seekTime = clickPosition * audioPlayer.duration;
        audioPlayer.currentTime = seekTime;
    });
    
    // When track ends, play next track
    audioPlayer.addEventListener('ended', nextTrack);
    
    // Sticky header
    const header = document.querySelector('header');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            header.style.padding = '0.5rem 2rem';
            header.style.backgroundColor = 'rgba(10, 10, 10, 0.95)';
        } else {
            header.style.padding = '1rem 2rem';
            header.style.backgroundColor = 'rgba(10, 10, 10, 0.9)';
        }
    });
    
    // Video section optimizations
    const videoFrame = document.querySelector('.video-wrapper iframe');
    
    // Add loading attribute for better performance
    if (videoFrame) {
        videoFrame.loading = 'lazy';
    }
    
    // Mailing list form - now redirects to Mailchimp
    const mailingListForm = document.getElementById('mailing-list-form');
    
    mailingListForm.addEventListener('submit', function(e) {
        // No need to prevent default, we want it to submit to Mailchimp
        // Form will open in a new tab thanks to target="_blank" attribute
        
        // Optional: You could add tracking here if needed
        if (typeof gtag !== 'undefined') {
            gtag('event', 'signup', {
                'event_category': 'Mailing List',
                'event_label': 'Signup Form'
            });
        }
    });
});

// Smooth scrolling for navigation links and any element with scroll-to class
document.querySelectorAll('nav a, .scroll-to').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        window.scrollTo({
            top: targetElement.offsetTop - 80, // Adjust for header height
            behavior: 'smooth'
        });
    });
});