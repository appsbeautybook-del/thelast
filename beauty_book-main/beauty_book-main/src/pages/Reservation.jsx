import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { entities } from '@/api/entities';
import StepUnifiedReservation from "@/components/reservation/StepUnifiedReservation";
import StepConfirmation from "@/components/reservation/StepConfirmation";

export default function Reservation() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const proEmail = state?.service?.pro_email || state?.proEmail || state?.bundle?.pro_email || null;

  const [step, setStep] = useState(1);
  const [proProfile, setProProfile] = useState(null);

  useEffect(() => {
    if (!proEmail) return;
    entities.ProfilPro.filter({ user_email: proEmail }, "-created_at", 1)
      .then(res => { if (res[0]) setProProfile(res[0]); })
      .catch(() => {});
  }, [proEmail]);

  const [booking, setBooking] = useState({
    services: state?.services || (state?.service ? [{ ...state.service, persons: 1 }] : []),
    bundle: state?.bundle || null,
    expert: null,
    date: null,
    time: "10:00",
    seat: null,
    customAnswers: {},
    salon: { name: state?.service?.pro_name || "Professionnel BeautyBook", address: state?.service?.pro_city || "" },
  });

  const updateBookingData = (dataObj) => setBooking(prev => ({ ...prev, ...dataObj }));

  if (step === 1) {
    return (
      <StepUnifiedReservation
        booking={booking}
        proProfile={proProfile}
        onUpdateBooking={updateBookingData}
        onNext={() => setStep(2)}
        onBack={() => navigate(-1)}
      />
    );
  }

  return (
    <StepConfirmation
      booking={booking}
      onConfirm={() => navigate("/")}
      onBack={() => setStep(1)}
    />
  );
}