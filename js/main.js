// Version control for cache busting
const VERSION = '1.2.5';

// Using 4 shows per page for optimal display balance

// Global function to stop all videos
function stopAllVideos() {
    console.log("Stopping all videos");
    const allIframes = document.querySelectorAll('.video-wrapper iframe');
    allIframes.forEach(iframe => {
        // Get the video ID from data attribute
        const videoId = iframe.getAttribute('data-video-id');
        if (videoId) {
            try {
                // Method 1: Try to use YouTube API postMessage to stop the video
                iframe.contentWindow.postMessage(JSON.stringify({
                    event: 'command',
                    func: 'stopVideo'
                }), '*');

                // Method 2: Force the iframe to reload with a new src
                const currentSrc = iframe.src;

                // First clear the src completely
                iframe.src = 'about:blank';

                // After a very short delay, reset the src to the proper embed URL with enablejsapi=1
                setTimeout(() => {
                    iframe.src = `https://www.youtube.com/embed/${videoId}?rel=0&enablejsapi=1`;
                }, 100);
            } catch (e) {
                console.error("Error stopping video:", e);
                // Fallback: just change the source directly
                iframe.src = `https://www.youtube.com/embed/${videoId}?rel=0&enablejsapi=1`;
            }
        }
    });

    // Method 3: Show all play overlays
    const overlays = document.querySelectorAll('.video-play-overlay');
    overlays.forEach(overlay => {
        overlay.style.display = '';
    });
}

// Helper function to add version to URLs
function getVersionedUrl(url) {
    return `${url}?v=${VERSION}`;
}

document.addEventListener('DOMContentLoaded', function() {
    // Venmo deep linking with fallback
    const venmoAppLink = document.getElementById('venmo-app-link');
    if (venmoAppLink) {
        const venmoWebUrl = 'https://account.venmo.com/u/AndrewPasquale';

        venmoAppLink.addEventListener('click', function(e) {
            // Store the deep link URL
            const deepLinkUrl = this.getAttribute('href');

            // On iOS and Android, attempt the deep link first
            if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                // Set a fallback timer in case the app isn't installed
                const fallbackTimeout = setTimeout(function() {
                    window.location.href = venmoWebUrl;
                }, 500);

                // If app opens, clear the timeout
                window.addEventListener('pagehide', function() {
                    clearTimeout(fallbackTimeout);
                }, { once: true });

                // Allow the deep link to proceed
                return true;
            } else {
                // On desktop, just go to the web version
                e.preventDefault();
                window.open(venmoWebUrl, '_blank');
                return false;
            }
        });
    }

    // Handle direct links to sections using URL hash
    if (window.location.hash) {
        const targetId = window.location.hash;
        const targetElement = document.querySelector(targetId);

        if (targetElement) {
            // Wait a bit for page to settle
            setTimeout(() => {
                const headerOffset = 80;
                window.scrollTo({
                    top: targetElement.offsetTop - headerOffset,
                    behavior: 'smooth'
                });
            }, 300);
        }
    }

    // Initialize video carousel
    initVideoCarousel();

    // Add organization structured data for the band
    function addOrganizationStructuredData() {
        const organizationData = {
            "@context": "https://schema.org",
            "@type": "MusicGroup",
            "name": "The Bromantics",
            "description": "Experience the high-voltage energy of The Bromantics, a six-piece powerhouse delivering blistering sets that splice the DNA of icons like Talking Heads, The Clash, and The Cure.",
            "url": "https://bromantics.band/",
            "logo": "https://bromantics.band/img/bromantics-stacked-white.png",
            "image": "https://bromantics.band/img/IMG_5040.jpg",
            "genre": "New Wave / Post-Punk",
            "email": "bromanticswmass@gmail.com",
            "sameAs": [
                "https://www.instagram.com/bromanticsband/",
                "https://www.facebook.com/TheBromanticsBand",
                "https://www.youtube.com/@thebromanticsband"
            ]
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-organization-schema', '');
        script.textContent = JSON.stringify(organizationData);
        document.head.appendChild(script);
    }

    // Add organization data on page load
    addOrganizationStructuredData();

    // ===== HERO SLIDER =====
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

    // ===== AUDIO PLAYER =====
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
        fetch(getVersionedUrl('audio/playlist.json'))
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
                        console.log('Track clicked - will play track');
                        const index = Array.from(tracks).indexOf(this);
                        loadTrack(index);

                        // Explicitly stop any playing videos before playing audio
                        stopAllVideos();

                        // Longer delay to ensure videos have properly stopped
                        setTimeout(() => {
                            playTrack();
                        }, 150);
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
                        console.log('Track clicked - will play track');
                        const index = Array.from(tracks).indexOf(this);
                        loadTrack(index);

                        // Explicitly stop any playing videos before playing audio
                        stopAllVideos();

                        // Longer delay to ensure videos have properly stopped
                        setTimeout(() => {
                            playTrack();
                        }, 150);
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
        console.log('Play track called - stopping videos');
        // Stop any playing videos first
        stopAllVideos();

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
        // Update main player button
        if (isPlaying) {
            playPauseBtn.innerHTML = '<i class="ti ti-player-pause"></i>';
            playPauseBtn.setAttribute('aria-label', 'Pause');
        } else {
            playPauseBtn.innerHTML = '<i class="ti ti-player-play"></i>';
            playPauseBtn.setAttribute('aria-label', 'Play');
        }

        // Update individual track play buttons
        tracks.forEach((track, index) => {
            const trackPlayBtn = track.querySelector('.play-btn');
            if (index === currentTrackIndex && isPlaying) {
                trackPlayBtn.innerHTML = '<i class="ti ti-player-pause"></i>';
                trackPlayBtn.setAttribute('aria-label', 'Pause');
            } else {
                trackPlayBtn.innerHTML = '<i class="ti ti-player-play"></i>';
                trackPlayBtn.setAttribute('aria-label', 'Play');
            }
        });
    }
    
    // Previous track function
    function prevTrack() {
        currentTrackIndex = (currentTrackIndex - 1 + trackData.length) % trackData.length;
        loadTrack(currentTrackIndex);
        if (isPlaying) {
            stopAllVideos();
            playTrack();
        }
    }

    // Next track function
    function nextTrack() {
        currentTrackIndex = (currentTrackIndex + 1) % trackData.length;
        loadTrack(currentTrackIndex);
        if (isPlaying) {
            stopAllVideos();
            playTrack();
        }
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

            // Always stop videos when playing audio
            // First stop the videos immediately
            stopAllVideos();

            // Then play the audio with a longer delay to ensure videos have properly stopped
            setTimeout(() => {
                playTrack();
            }, 150);
        }
    });
    
    prevBtn.addEventListener('click', prevTrack);
    nextBtn.addEventListener('click', nextTrack);
    
    // Progress bar update
    audioPlayer.addEventListener('timeupdate', function() {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.style.width = progress + '%';

        // Update accessibility attributes
        const progressContainer = document.querySelector('.progress-container');
        progressContainer.setAttribute('aria-valuenow', Math.round(progress));

        // Calculate and display time for screen readers
        const currentTime = formatTime(audioPlayer.currentTime);
        const duration = formatTime(audioPlayer.duration);
        progressContainer.setAttribute('aria-valuetext', `${currentTime} of ${duration}`);
    });

    // Format time helper function for accessibility
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }
    
    // Click on progress bar to seek
    progressContainer.addEventListener('click', function(e) {
        const clickPosition = (e.offsetX / this.offsetWidth);
        const seekTime = clickPosition * audioPlayer.duration;
        audioPlayer.currentTime = seekTime;
    });
    
    // When track ends, play next track
    audioPlayer.addEventListener('ended', nextTrack);

    // Ensure videos are stopped when audio starts playing
    audioPlayer.addEventListener('play', function() {
        console.log('Audio started playing - ensuring videos are stopped');
        stopAllVideos();
    });
    
    // ===== SHOWS SECTION =====
    // Shows container and UI elements
    const showsContainer = document.getElementById('shows-container');
    const noShowsMessage = document.querySelector('.no-shows-message');
    const loadingIndicator = document.querySelector('.loading-indicator');
    const paginationContainer = document.getElementById('pagination-container');
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    // Current active tab (default to upcoming)
    let activeTab = 'upcoming';
    // Pagination settings
    const showsPerPage = 4; // Set to 4 shows per page
    let currentPage = 1;
    let totalPages = 1;
    let allShows = []; // Store all filtered shows for pagination
    
    // Event listeners for tab buttons
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // If already active, do nothing
            if (this.classList.contains('active')) return;

            // Update active tab
            activeTab = this.getAttribute('data-tab');

            // Update active button styling
            tabButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Reset to first page when changing tabs
            currentPage = 1;

            // First fade out the current content
            showsContainer.classList.add('fade-out');

            // After fade out completes, update content
            setTimeout(() => {
                // Clear content and show loading indicator
                showsContainer.innerHTML = '';
                loadingIndicator.style.display = 'flex';
                noShowsMessage.style.display = 'none';
                paginationContainer.innerHTML = '';

                // Load shows for the selected tab
                loadShows(activeTab);
            }, 300); // Match this timing with the CSS transition duration
        });
    });
    
    // Function to load shows from JSON file
    function loadShows(tabType = 'upcoming') {
        fetch(getVersionedUrl('data/shows.json'))
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Get current date (at the start of day to compare dates properly)
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                // Filter shows based on tab type and current date
                allShows = data.shows.filter(show => {
                    const showDate = new Date(show.date);
                    showDate.setHours(0, 0, 0, 0);
                    const isPast = showDate < today;
                    return tabType === 'upcoming' ? !isPast : isPast;
                });
                
                // Sort shows by date
                allShows.sort((a, b) => {
                    // For upcoming shows: ascending order (closest first)
                    // For past shows: descending order (most recent first)
                    return tabType === 'upcoming' 
                        ? new Date(a.date) - new Date(b.date)
                        : new Date(b.date) - new Date(a.date);
                });
                
                // Hide loading indicator
                loadingIndicator.style.display = 'none';
                
                // Display shows or no shows message
                if (allShows.length > 0) {
                    // Calculate total pages
                    totalPages = Math.ceil(allShows.length / showsPerPage);
                    
                    // Render current page of shows
                    renderCurrentPage();
                    
                    // Generate pagination
                    renderPagination();
                    
                    noShowsMessage.style.display = 'none';
                } else {
                    showsContainer.innerHTML = '';
                    paginationContainer.innerHTML = '';
                    noShowsMessage.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Error loading shows:', error);
                loadingIndicator.style.display = 'none';
                showsContainer.innerHTML = '<div class="error-message">Sorry, there was an error loading the shows. Please try again later.</div>';
                paginationContainer.innerHTML = '';
            });
    }
    
    // Function to render current page of shows
    function renderCurrentPage() {
        // Calculate start and end indices for current page
        const startIndex = (currentPage - 1) * showsPerPage;
        const endIndex = Math.min(startIndex + showsPerPage, allShows.length);
        
        // Get shows for current page
        const currentShows = allShows.slice(startIndex, endIndex);
        
        // Render shows
        renderShows(currentShows);
    }
    
    // Function to render pagination
    function renderPagination() {
        paginationContainer.innerHTML = '';
        
        // Don't show pagination if only one page
        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }
        
        paginationContainer.style.display = 'flex';
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = `page-btn ${currentPage === 1 ? 'disabled' : ''}`;
        prevBtn.innerHTML = '<i class="ti ti-chevron-left"></i>';
        prevBtn.setAttribute('aria-label', 'Previous page');
        if (currentPage > 1) {
            prevBtn.addEventListener('click', () => {
                // Add fade-out effect
                showsContainer.classList.add('fade-out');

                setTimeout(() => {
                    currentPage--;
                    renderCurrentPage();
                    renderPagination();
                    // Scroll to top of shows section
                    document.getElementById('shows').scrollIntoView({ behavior: 'smooth' });
                }, 300);
            });
        }
        paginationContainer.appendChild(prevBtn);
        
        // Page buttons (limited to 5 buttons with ellipsis)
        const renderPageButtons = () => {
            // Always show first page
            renderPageButton(1);
            
            // Calculate range to show
            if (totalPages <= 7) {
                // If 7 or fewer pages, show all page buttons
                for (let i = 2; i < totalPages; i++) {
                    renderPageButton(i);
                }
            } else {
                // Handle cases with more than 7 pages
                if (currentPage <= 3) {
                    // Near the start
                    for (let i = 2; i <= 5; i++) {
                        renderPageButton(i);
                    }
                    renderEllipsis();
                } else if (currentPage >= totalPages - 2) {
                    // Near the end
                    renderEllipsis();
                    for (let i = totalPages - 4; i < totalPages; i++) {
                        renderPageButton(i);
                    }
                } else {
                    // Middle: show ellipsis on both sides
                    renderEllipsis();
                    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                        renderPageButton(i);
                    }
                    renderEllipsis();
                }
            }
            
            // Always show last page
            if (totalPages > 1) {
                renderPageButton(totalPages);
            }
        };
        
        // Helper to render page button
        function renderPageButton(pageNum) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${pageNum === currentPage ? 'active' : ''}`;
            pageBtn.textContent = pageNum;
            pageBtn.setAttribute('aria-label', `Page ${pageNum}`);
            if (pageNum !== currentPage) {
                pageBtn.addEventListener('click', () => {
                    // Add fade-out effect
                    showsContainer.classList.add('fade-out');

                    setTimeout(() => {
                        currentPage = pageNum;
                        renderCurrentPage();
                        renderPagination();
                        // Scroll to top of shows section
                        document.getElementById('shows').scrollIntoView({ behavior: 'smooth' });
                    }, 300);
                });
            }
            paginationContainer.appendChild(pageBtn);
        }
        
        // Helper to render ellipsis
        function renderEllipsis() {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'page-btn disabled';
            ellipsis.innerHTML = '&hellip;';
            ellipsis.style.pointerEvents = 'none';
            ellipsis.setAttribute('aria-hidden', 'true');
            paginationContainer.appendChild(ellipsis);
        }
        
        // Render the page buttons
        renderPageButtons();
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = `page-btn ${currentPage === totalPages ? 'disabled' : ''}`;
        nextBtn.innerHTML = '<i class="ti ti-chevron-right"></i>';
        nextBtn.setAttribute('aria-label', 'Next page');
        if (currentPage < totalPages) {
            nextBtn.addEventListener('click', () => {
                // Add fade-out effect
                showsContainer.classList.add('fade-out');

                setTimeout(() => {
                    currentPage++;
                    renderCurrentPage();
                    renderPagination();
                    // Scroll to top of shows section
                    document.getElementById('shows').scrollIntoView({ behavior: 'smooth' });
                }, 300);
            });
        }
        paginationContainer.appendChild(nextBtn);
    }
    
    // Function to generate structured data for events
    function generateEventStructuredData(shows) {
        // Only include upcoming shows
        const upcomingShows = shows.filter(show => new Date(show.date) >= new Date());

        if (upcomingShows.length === 0) return;

        // Remove any existing event structured data
        const existingStructuredData = document.querySelector('script[data-event-schema]');
        if (existingStructuredData) {
            existingStructuredData.remove();
        }

        // Create JSON-LD structured data
        const eventData = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": upcomingShows.map((show, index) => {
                // Parse time for start/end time
                let startTime = null;
                let endTime = null;

                if (show.time) {
                    const timeMatch = show.time.match(/(\d+:\d+)\s*(?:-|–)\s*(\d+:\d+)\s*(AM|PM|am|pm)?/);
                    if (timeMatch) {
                        const startHour = timeMatch[1];
                        const endHour = timeMatch[2];
                        const period = timeMatch[3] || 'PM'; // Default to PM if not specified

                        startTime = `${show.date}T${startHour}:00`;
                        endTime = `${show.date}T${endHour}:00`;
                    }
                }

                return {
                    "@type": "ListItem",
                    "position": index + 1,
                    "item": {
                        "@type": "MusicEvent",
                        "name": `The Bromantics at ${show.venue}`,
                        "startDate": startTime || show.date,
                        "endDate": endTime || show.date,
                        "location": {
                            "@type": "Place",
                            "name": show.venue,
                            "address": {
                                "@type": "PostalAddress",
                                "streetAddress": show.location
                            }
                        },
                        "offers": {
                            "@type": "Offer",
                            "availability": "https://schema.org/InStock",
                            "url": `https://bromantics.band/#shows`
                        },
                        "performer": {
                            "@type": "MusicGroup",
                            "name": "The Bromantics",
                            "genre": "New Wave / Post-Punk",
                            "sameAs": [
                                "https://www.instagram.com/bromanticsband/",
                                "https://www.facebook.com/TheBromanticsBand",
                                "https://www.youtube.com/@thebromanticsband"
                            ]
                        },
                        "description": show.support || "Live music by The Bromantics"
                    }
                };
            })
        };

        // Add to page
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-event-schema', '');
        script.textContent = JSON.stringify(eventData);
        document.head.appendChild(script);
    }

    // Function to render shows
    function renderShows(shows) {
        // Clear container
        showsContainer.innerHTML = '';

        // Make sure fade-out class is removed and add it back after rendering
        showsContainer.classList.add('fade-out');

        // Create show elements
        shows.forEach(show => {
            const showElement = document.createElement('div');
            showElement.className = 'show-item';

            // Add microdata attributes for better SEO
            showElement.setAttribute('itemscope', '');
            showElement.setAttribute('itemtype', 'https://schema.org/MusicEvent');

            // Extract year from date for all shows in the past tab
            const showDate = new Date(show.date);
            const showYear = showDate.getFullYear();

            // Always show year for shows in the past tab
            const isPastShow = activeTab === 'past';

            showElement.innerHTML = `
                <meta itemprop="name" content="The Bromantics at ${show.venue}">
                <meta itemprop="startDate" content="${show.date}">
                <meta itemprop="performer" content="The Bromantics">

                <div class="show-date">
                    <span class="day">${show.day}</span>
                    <span class="month">${show.month}</span>
                    ${isPastShow ? `<span class="year">${showYear}</span>` : ''}
                </div>
                <div class="show-info">
                    <h3 itemprop="location" itemscope itemtype="https://schema.org/Place">
                        <span itemprop="name">${show.venue}</span>
                        <meta itemprop="address" content="${show.location}">
                    </h3>
                    <p class="location">${show.location}</p>
                    <p class="time" itemprop="doorTime">${show.time}</p>
                    <p class="support" itemprop="description">${show.support}</p>
                </div>
                <div class="show-links">
                    <a href="https://maps.google.com/?q=${show.mapQuery}" target="_blank" class="btn-small"><i class="ti ti-map-pin"></i> Map</a>
                </div>
            `;
            showsContainer.appendChild(showElement);
        });

        // Generate structured data for events
        if (activeTab === 'upcoming') {
            generateEventStructuredData(shows);
        }

        // After a brief delay, fade the content back in
        setTimeout(() => {
            showsContainer.classList.remove('fade-out');
        }, 50);
    }
    
    // Initial load of shows (default to upcoming)
    loadShows(activeTab);
    
    // ===== VIDEO CAROUSEL =====
    function initVideoCarousel() {
        const videoGallery = document.querySelector('.video-gallery');
        const prevBtn = document.querySelector('.video-nav.prev');
        const nextBtn = document.querySelector('.video-nav.next');

        // Video data
        const videos = [
            {
                id: 'HUsfZO2Gh5s',
                title: 'The Bromantics - I Wanna Be Sedated (Cover)'
            },
            {
                id: 'JKAPtkGTcgs',
                title: 'The Bromantics - Echo Beach (Cover)'
            },
            {
                id: 'dxuhfqz_3fE',
                title: 'The Bromantics - This Charming Man (Cover)'
            }
            // Add more videos as needed
        ];

        let currentVideoIndex = 0;

        // Create video elements
        function createVideoElements() {
            videoGallery.innerHTML = '';

            videos.forEach((video, index) => {
                const videoWrapper = document.createElement('div');
                videoWrapper.className = 'video-wrapper';

                // Create iframe with enablejsapi=1 to allow API control
                videoWrapper.innerHTML = `
                    <iframe
                        src="https://www.youtube.com/embed/${video.id}?rel=0&enablejsapi=1"
                        title="${video.title}"
                        frameborder="0"
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowfullscreen
                        loading="lazy"
                        data-video-id="${video.id}"
                        class="youtube-player">
                    </iframe>
                    <div class="video-play-overlay" data-index="${index}">
                        <div class="play-icon">
                            <i class="ti ti-player-play-filled"></i>
                        </div>
                    </div>
                    <div class="video-controls">
                        <button class="fullscreen-btn" aria-label="Fullscreen" data-video-id="${video.id}">
                            <i class="ti ti-arrows-maximize"></i>
                        </button>
                    </div>
                `;
                videoGallery.appendChild(videoWrapper);

                // Add click event to play overlay
                const overlay = videoWrapper.querySelector('.video-play-overlay');
                overlay.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation(); // Prevent event bubbling
                    const videoIndex = parseInt(this.getAttribute('data-index'));

                    // Hide this overlay immediately
                    this.style.display = 'none';

                    // Get current iframe
                    const clickedIframe = this.previousElementSibling;
                    const videoId = clickedIframe.getAttribute('data-video-id');

                    // Pause audio player if it's playing
                    if (audioPlayer && !audioPlayer.paused) {
                        pauseTrack();
                    }

                    // Stop all OTHER videos (not the one we're about to play)
                    const allIframes = document.querySelectorAll('.video-wrapper iframe');
                    allIframes.forEach(iframe => {
                        if (iframe !== clickedIframe) {
                            const otherVideoId = iframe.getAttribute('data-video-id');
                            if (otherVideoId) {
                                iframe.src = `https://www.youtube.com/embed/${otherVideoId}?rel=0&enablejsapi=1`;
                            }
                        }
                    });

                    // Show all OTHER overlays
                    const allOverlays = document.querySelectorAll('.video-play-overlay');
                    allOverlays.forEach(otherOverlay => {
                        if (otherOverlay !== this) {
                            otherOverlay.style.display = '';
                        }
                    });

                    // Start this video with a slight delay to ensure others are stopped
                    setTimeout(() => {
                        clickedIframe.src = `https://www.youtube.com/embed/${videoId}?rel=0&autoplay=1&enablejsapi=1`;
                    }, 100);
                });

                // Add fullscreen button functionality
                const fullscreenBtn = videoWrapper.querySelector('.fullscreen-btn');
                fullscreenBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation(); // Prevent event bubbling

                    const videoId = this.getAttribute('data-video-id');
                    const iframe = videoWrapper.querySelector('iframe');

                    // Check if browser supports Fullscreen API
                    if (iframe.requestFullscreen) {
                        iframe.requestFullscreen();
                    } else if (iframe.webkitRequestFullscreen) { /* Safari */
                        iframe.webkitRequestFullscreen();
                    } else if (iframe.msRequestFullscreen) { /* IE11 */
                        iframe.msRequestFullscreen();
                    } else {
                        // Fallback for browsers that don't support fullscreen API
                        // Open video in a new tab
                        window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
                    }
                });
            });

            // Create video dots for navigation
            createVideoDots();

            // No visible counter display - using dots for visual navigation
        }

        // Create navigation dots
        function createVideoDots() {
            const carouselContainer = document.querySelector('.carousel-container');
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'video-dots';
            dotsContainer.setAttribute('role', 'tablist');
            dotsContainer.setAttribute('aria-label', 'Video navigation');

            videos.forEach((_, index) => {
                const dot = document.createElement('button');
                dot.className = index === 0 ? 'video-dot active' : 'video-dot';
                dot.setAttribute('role', 'tab');
                dot.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
                dot.setAttribute('aria-label', `Video ${index + 1}`);
                dot.addEventListener('click', () => goToVideo(index));
                dotsContainer.appendChild(dot);
            });

            carouselContainer.appendChild(dotsContainer);
        }

        // Function to update carousel
        function updateCarousel() {
            // Simple position calculation - each video takes 100% of container
            const position = currentVideoIndex * 100;

            // Update gallery position
            videoGallery.style.transform = `translateX(-${position}%)`;

            // Reset all overlays
            const overlays = document.querySelectorAll('.video-play-overlay');
            overlays.forEach(overlay => {
                overlay.style.display = '';
            });

            // Ensure videos are clickable
            const allIframes = document.querySelectorAll('.video-wrapper iframe');
            allIframes.forEach(iframe => {
                iframe.style.pointerEvents = 'auto';
            });

            // Counter display removed - using dots for navigation

            // Update dots
            const dots = document.querySelectorAll('.video-dot');
            dots.forEach((dot, index) => {
                if (index === currentVideoIndex) {
                    dot.classList.add('active');
                    dot.setAttribute('aria-selected', 'true');
                } else {
                    dot.classList.remove('active');
                    dot.setAttribute('aria-selected', 'false');
                }
            });
        }

        // Go to specific video
        function goToVideo(index) {
            currentVideoIndex = index;
            updateCarousel();
        }

        // Next video
        function nextVideo() {
            currentVideoIndex = (currentVideoIndex + 1) % videos.length;
            updateCarousel();
        }

        // Previous video
        function prevVideo() {
            currentVideoIndex = (currentVideoIndex - 1 + videos.length) % videos.length;
            updateCarousel();
        }

        // Event listeners
        if (prevBtn) prevBtn.addEventListener('click', prevVideo);
        if (nextBtn) nextBtn.addEventListener('click', nextVideo);

        // Keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.target.closest('.video-carousel')) {
                if (e.key === 'ArrowLeft') prevVideo();
                if (e.key === 'ArrowRight') nextVideo();
            }
        });

        // Touch swipe functionality for the carousel
        function addSwipeSupport() {
            const carousel = document.querySelector('.video-carousel');
            if (!carousel) return;

            let touchStartX = 0;
            let touchEndX = 0;
            const minSwipeDistance = 50; // Minimum distance required for a swipe

            carousel.addEventListener('touchstart', function(e) {
                // Store starting position
                touchStartX = e.changedTouches[0].screenX;

                // Check if we're touching an interactive element
                const isInteractive = e.target.closest('.video-play-overlay') ||
                                     e.target.closest('.fullscreen-btn') ||
                                     e.target.closest('.video-nav');

                if (!isInteractive) {
                    // Add swiping class for immediate feedback during touch
                    const gallery = document.querySelector('.video-gallery');
                    if (gallery) {
                        gallery.classList.add('swiping');
                    }
                }

                // Don't prevent default behavior - allows play buttons to be clicked
            }, { passive: true });

            // Add touchmove handler for visual feedback during swipe
            carousel.addEventListener('touchmove', function(e) {
                const isInteractive = e.target.closest('.video-play-overlay') ||
                                     e.target.closest('.fullscreen-btn') ||
                                     e.target.closest('.video-nav');

                // Skip if we're touching interactive elements
                if (!isInteractive) {
                    const currentX = e.changedTouches[0].screenX;
                    const dragDistance = currentX - touchStartX;

                    // Apply subtle visual drag effect if movement is significant
                    if (Math.abs(dragDistance) > 10) {
                        const gallery = document.querySelector('.video-gallery');
                        if (gallery) {
                            const currentPosition = currentVideoIndex * 100;
                            const dragEffect = dragDistance * 0.1; // Scale down for subtle effect
                            gallery.style.transform = `translateX(-${currentPosition - dragEffect}%)`;
                        }
                    }
                }
            }, { passive: true });

            carousel.addEventListener('touchend', function(e) {
                // Get the ending position
                touchEndX = e.changedTouches[0].screenX;

                // Check if we're touching an interactive element
                const isInteractive = e.target.closest('.video-play-overlay') ||
                                     e.target.closest('.fullscreen-btn') ||
                                     e.target.closest('.video-nav');

                // Remove swiping class to restore normal transition
                const gallery = document.querySelector('.video-gallery');
                if (gallery) {
                    gallery.classList.remove('swiping');

                    // Reset the transform if we're not processing the swipe
                    // or if it wasn't a significant enough swipe
                    const swipeDistance = touchEndX - touchStartX;
                    if (isInteractive || Math.abs(swipeDistance) < minSwipeDistance) {
                        const currentPosition = currentVideoIndex * 100;
                        setTimeout(() => {
                            gallery.style.transform = `translateX(-${currentPosition}%)`;
                        }, 10);
                    }
                }

                // Don't process swipe if the touch target is a play overlay or control button
                if (!isInteractive) {
                    handleSwipe();
                }
            }, { passive: true });

            // Handle touchcancel event for edge cases
            carousel.addEventListener('touchcancel', function() {
                // Reset state if touch is cancelled
                const gallery = document.querySelector('.video-gallery');
                if (gallery) {
                    gallery.classList.remove('swiping');

                    // Reset position
                    const currentPosition = currentVideoIndex * 100;
                    gallery.style.transform = `translateX(-${currentPosition}%)`;
                }
            }, { passive: true });

            function handleSwipe() {
                const swipeDistance = touchEndX - touchStartX;

                if (Math.abs(swipeDistance) >= minSwipeDistance) {
                    // Determine swipe direction
                    if (swipeDistance > 0) {
                        // Swiped right (previous video)
                        prevVideo();
                    } else {
                        // Swiped left (next video)
                        nextVideo();
                    }
                }
            }
        }

        // Initialize
        createVideoElements();
        addSwipeSupport();

        // Videos continue playing even when scrolled away
    }

    // ===== UI OPTIMIZATIONS =====
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
    
    // Mailing list form - now redirects to Mailchimp
    const mailingListForm = document.getElementById('mailing-list-form');
    
    if (mailingListForm) {
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
    }
});

// Smooth scrolling for navigation links and any element with scroll-to class
document.querySelectorAll('nav a, .scroll-to, .slide-content a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();

        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);

        // Use consistent header offset for all links
        const headerOffset = 80; // Adjust for header height

        window.scrollTo({
            top: targetElement.offsetTop - headerOffset,
            behavior: 'smooth'
        });

        // Update URL with hash without triggering a page jump
        if (history.pushState) {
            history.pushState(null, null, targetId);
        } else {
            // Fallback for older browsers
            window.location.hash = targetId;
        }
    });
});

// Handle URL hash updates when scrolling
window.addEventListener('scroll', function() {
    // Don't run this on every scroll event - use throttling
    if (!window.scrollTimeout) {
        window.scrollTimeout = setTimeout(function() {
            // Clear the timeout
            window.scrollTimeout = null;

            // Get all sections
            const sections = document.querySelectorAll('section[id]');
            const scrollPosition = window.scrollY;

            // Find the section that is currently in view
            // Using a small offset to trigger the section a bit earlier
            const headerOffset = 100;

            // Track which section is currently in view with the most visibility
            let currentSection = null;
            let maxVisibleArea = 0;

            sections.forEach(section => {
                const sectionTop = section.offsetTop - headerOffset;
                const sectionHeight = section.offsetHeight;
                const sectionBottom = sectionTop + sectionHeight;

                // Calculate how much of the section is visible in the viewport
                const viewportHeight = window.innerHeight;
                const visibleTop = Math.max(sectionTop, scrollPosition);
                const visibleBottom = Math.min(sectionBottom, scrollPosition + viewportHeight);

                if (visibleBottom > visibleTop) {
                    const visibleArea = visibleBottom - visibleTop;
                    if (visibleArea > maxVisibleArea) {
                        maxVisibleArea = visibleArea;
                        currentSection = section;
                    }
                }
            });

            // Update URL if a section is in view and it's not already in the URL
            if (currentSection && currentSection.id) {
                const hash = '#' + currentSection.id;
                if (history.replaceState && window.location.hash !== hash) {
                    history.replaceState(null, null, hash);
                }
            }
        }, 100); // Throttle to run at most every 100ms
    }
});

// Update copyright year - using a self-executing function for immediate execution
(function() {
    const copyrightYearElement = document.getElementById('copyright-year');
    if (copyrightYearElement) {
        copyrightYearElement.textContent = new Date().getFullYear();
    }
})();