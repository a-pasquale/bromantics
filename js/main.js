// Version control for cache busting
const VERSION = '1.0.3';

// Using 4 shows per page for optimal display balance

// Helper function to add version to URLs
function getVersionedUrl(url) {
    return `${url}?v=${VERSION}`;
}

document.addEventListener('DOMContentLoaded', function() {
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
            // Update active tab
            activeTab = this.getAttribute('data-tab');
            
            // Update active button styling
            tabButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Reset to first page when changing tabs
            currentPage = 1;
            
            // Show loading indicator
            showsContainer.innerHTML = '';
            loadingIndicator.style.display = 'flex';
            noShowsMessage.style.display = 'none';
            paginationContainer.innerHTML = '';
            
            // Load shows for the selected tab
            loadShows(activeTab);
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
                currentPage--;
                renderCurrentPage();
                renderPagination();
                // Scroll to top of shows section
                document.getElementById('shows').scrollIntoView({ behavior: 'smooth' });
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
                    currentPage = pageNum;
                    renderCurrentPage();
                    renderPagination();
                    // Scroll to top of shows section
                    document.getElementById('shows').scrollIntoView({ behavior: 'smooth' });
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
                currentPage++;
                renderCurrentPage();
                renderPagination();
                // Scroll to top of shows section
                document.getElementById('shows').scrollIntoView({ behavior: 'smooth' });
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
        
        // Create show elements
        shows.forEach(show => {
            const showElement = document.createElement('div');
            showElement.className = 'show-item';
            
            // Add microdata attributes for better SEO
            showElement.setAttribute('itemscope', '');
            showElement.setAttribute('itemtype', 'https://schema.org/MusicEvent');
            
            showElement.innerHTML = `
                <meta itemprop="name" content="The Bromantics at ${show.venue}">
                <meta itemprop="startDate" content="${show.date}">
                <meta itemprop="performer" content="The Bromantics">
                
                <div class="show-date">
                    <span class="day">${show.day}</span>
                    <span class="month">${show.month}</span>
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
    }
    
    // Initial load of shows (default to upcoming)
    loadShows(activeTab);
    
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
    
    // Video section optimizations
    const videoFrame = document.querySelector('.video-wrapper iframe');
    
    // Add loading attribute for better performance
    if (videoFrame) {
        videoFrame.loading = 'lazy';
    }
    
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

        // Add additional offset for slider links to prevent header overlap
        const isSliderLink = this.closest('.slide-content') !== null;
        const headerOffset = isSliderLink ? 100 : 80;

        window.scrollTo({
            top: targetElement.offsetTop - headerOffset, // Adjust for header height with extra offset for slider links
            behavior: 'smooth'
        });
    });
});

// Update copyright year - using a self-executing function for immediate execution
(function() {
    const copyrightYearElement = document.getElementById('copyright-year');
    if (copyrightYearElement) {
        copyrightYearElement.textContent = new Date().getFullYear();
    }
})();