import React, { useState, useEffect, useRef } from "react";
import { Carousel } from "antd";
import "./Onboarding.scss";

import LoopingVideo from "../../../components/common/LoopingVideo";
import { getUtmParams } from "../../../components/userOnboarding/services/userDataService";
import { detectOperatingSystem } from "../../../utils/loginUtils";
import useSlickImageClickGuard from "../../../hooks/useSlickImageClickGuard";
import { ASSETS } from "../../../assets";
const doctorsDayBanner = ASSETS.images.offerings.doctorsDay;
const smartSync = ASSETS.images.websiteImages.smartsyncbanner;
const practiceManagement = ASSETS.images.websiteImages.practicemanagementbanner;
const ddxBanner = ASSETS.images.websiteImages.ddxbanner;
const emrBanner = ASSETS.images.websiteImages.emrbanner;
const tatvaAiBanner = ASSETS.images.websiteImages.tatvaaibanner;
const fastBackwardWebm = ASSETS.images.onboardPageIcons.fastBackward_2;
const fastBackwardMp4 = ASSETS.images.onboardPageIcons.fastBackward;

const PROGRESS_TICK_MS = 50; // 50ms * 100 steps = 5000ms per slide

/**
 * Owns the 50ms progress ticker so the ticking state lives here instead of in
 * the parent. Keeping it out of the parent stops the antd <Carousel> from
 * re-rendering 20 times a second, which both saves work on low-end mobile
 * devices and keeps react-slick from re-wrapping the slide images' onclick
 * handlers on every tick.
 */
const CarouselProgressDots = ({ slideCount, currentSlide, onDotClick, onAdvance }) => {
  const [progress, setProgress] = useState(0);
  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;

  // Restart the bar whenever the carousel lands on a new slide.
  useEffect(() => {
    setProgress(0);
  }, [currentSlide]);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((oldProgress) => Math.min(oldProgress + 1, 100));
    }, PROGRESS_TICK_MS);

    return () => {
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      onAdvanceRef.current();
    }
  }, [progress]);

  return (
    <div className="custom-dots">
      {Array.from({ length: slideCount }, (_, index) => (
        <div
          key={index}
          className="dot-container"
          onClick={() => onDotClick(index)}
        >
          <div
            className="progress-bar"
            style={{
              width: `${
                index === currentSlide
                  ? progress
                  : index < currentSlide
                  ? 100
                  : 0
              }%`,
              backgroundColor: index <= currentSlide ? "#5857DC" : "#E4E4E7",
            }}
          />
        </div>
      ))}
    </div>
  );
};

const OnboardingCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef(null);
  const carouselContainerRef = useRef(null);

  // react-slick chains a new onclick closure onto every slide image on each of
  // its updates; without this the chain eventually overflows the stack when a
  // banner is tapped.
  useSlickImageClickGuard(carouselContainerRef);

  // Get UTM params
  const utm = getUtmParams();

  const baseCarouselItems = [
    {
      id: 0,
      title: "Your care makes",
      subtitle: "a big difference daily.",
      image: doctorsDayBanner,
      imageAvif: null,
      utmKey: "doctorsday",
    },
    {
      id: 1,
      title: "Boost Your Practice with",
      subtitle: "Our AI-Powered Smart Sync",
      image: smartSync,
      imageAvif: null,
      utmKey: "smartsync",
    },
    {
      id: 2,
      title: "AI-Powered",
      subtitle: "Clinical Decision Support",
      image: ddxBanner,
      imageAvif: null,
      utmKey: "ddx",
    },
    {
      id: 3,
      title: "Build and Scale Your",
      subtitle: "Online Presence with Us",
      image: practiceManagement,
      imageAvif: null,
      utmKey: "practice",
    },
    {
      id: 4,
      title: "Supercharge Your",
      subtitle: "Research with TatvaAI",
      image: tatvaAiBanner,
      imageAvif: null,
      utmKey: "tatvaai",
    },
    {
      id: 5,
      title: "India's Best EMR",
      subtitle: "Trusted by 10,000+ Doctors",
      image: emrBanner,
      imageAvif: null,
      utmKey: "emr",
    },
  ];

  const sortCarouselItems = () => {
    const utm = getUtmParams();
    const utmTerm = utm.utm_term;
    // If no UTM term, return original order
    if (!utmTerm) return baseCarouselItems;

    return [
      // First, find the item that matches the UTM term
      ...baseCarouselItems.filter((item) => item.utmKey === utmTerm),
      // Then add all other items
      ...baseCarouselItems.filter((item) => item.utmKey !== utmTerm),
    ];
  };

  const carouselItems = sortCarouselItems();

  const goToNextSlide = () => {
    if (carouselRef.current) {
      carouselRef.current.next();
    }
  };

  const goToSlide = (index) => {
    if (carouselRef.current) {
      carouselRef.current.goTo(index);
    }
  };

  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    effect: "rtl",
    cssEase: "ease-in-out",
    beforeChange: (_, next) => {
      setCurrentSlide(next);
    },
  };

  const handleExploreMore = () => {
    window.Moengage?.track_event?.("TP_NewLoginFlow_Explore_more", {
      clicked: true,
      operating_system: detectOperatingSystem(),
      utm_campaign: utm.utm_campaign ?? 'NA',
      utm_source: utm.utm_source ?? 'NA',
      utm_medium: utm.utm_medium ?? 'NA',
      utm_content: utm.utm_content ?? 'NA',
      utm_term: utm.utm_term ?? 'NA',
      is_marketing: Object.values(utm).some(value => value && value.length > 0),
    });
    const trustedBySection = document.getElementById("trusted-by-section");
    if (trustedBySection) {
      trustedBySection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="onboarding-carousel-wrapper">
      <div className="logo-container">
        <img
          src={ASSETS.images.logo}
          className="d-inline-block align-top"
          width="150px"
          height="35px"
          alt="Logo"
        />
      </div>

      <div className="carousel-container" ref={carouselContainerRef}>
        <Carousel ref={carouselRef} {...settings}>
          {carouselItems.map((item, index) => (
            <div key={index} className="carousel-item">
              <div className="text-content">
                <h1>{item.title}</h1>
                <h1>{item.subtitle}</h1>
              </div>
              <div className="banner-container">
                <picture>
                  {item.imageAvif ? (
                    <source srcSet={item.imageAvif} type="image/avif" />
                  ) : null}
                  <source srcSet={item.image} type="image/webp" />
                  <img
                    src={item.image}
                    alt={item.title}
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                    decoding="async"
                    width={641}
                    height={496}
                    style={{
                      display: "block",
                      width: "100%",
                      maxWidth: "641px",
                      height: "auto",
                      aspectRatio: "641 / 496",
                    }}
                  />
                </picture>
              </div>
            </div>
          ))}
        </Carousel>

        <CarouselProgressDots
          slideCount={carouselItems.length}
          currentSlide={currentSlide}
          onDotClick={goToSlide}
          onAdvance={goToNextSlide}
        />
      </div>

      <div className="explore-more" onClick={handleExploreMore} style={{ cursor: 'pointer' }}>
        <button>
          Explore more
          <LoopingVideo
            webm={fastBackwardWebm}
            mp4={fastBackwardMp4}
            className="scroll-arrow"
            ariaLabel="scroll down"
          />
        </button>
      </div>
    </div>
  );
};

export default OnboardingCarousel;
