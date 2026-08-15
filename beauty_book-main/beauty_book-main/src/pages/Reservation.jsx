import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import StepServices from "@/components/reservation/StepServices";
import StepExpert from "@/components/reservation/StepExpert";
import StepCalendar from "@/components/reservation/StepCalendar";
import StepConfirmation from "@/components/reservation/StepConfirmation";

export default function Reservation() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const proEmail = state?.service?.pro_email || state?.proEmail || null;

  const [step, setStep] = useState(0);
  const [proProfile, setProProfile] = useState(null);
  const [resolvedProEmail, setResolvedProEmail] = useState(proEmail);

  useEffect(() => {
    if (proEmail) {
      setResolvedProEmail(proEmail);
      entities.ProfilPro.filter({ user_email: proEmail }, "-created_at", 1)
        .then(res => { if (res[0]) setProProfile(res[0]); })
        .catch(() => {});
      return;
    }
    // Fallback: if no proEmail from state, try logged-in user's ProfilPro
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.email) return;
      entities.ProfilPro.filter({ user_email: user.email }, "-created_at", 1)
        .then(res => {
          if (res[0]) {
            setProProfile(res[0]);
            setResolvedProEmail(res[0].user_email || user.email);
          }
        })
        .catch(() => {});
    });
  }, [proEmail]);

  const [booking, setBooking] = useState({
    services: state?.service ? [{ ...state.service, persons: 1 }] : [],
    expert: null,
    date: null,
    time: null,
    seat: null,
    notes: "",
    salon: { name: state?.service?.pro_name || "Professionnel BeautyBook", address: state?.service?.pro_city || "", pro_email: proEmail || resolvedProEmail || "" },
  });

  const update = (key, value) => setBooking(prev => ({ ...prev, [key]: value }));

  const steps = [
    <StepServices
      selected={booking.services}
      onSelect={s => update("services", s)}
      onNext={() => setStep(1)}
      onBack={() => navigate(-1)}
      proEmail={resolvedProEmail}
    />,
    <StepExpert
      selected={booking.expert}
      onSelect={e => update("expert", e)}
      onNext={() => setStep(2)}
      onBack={() => setStep(1)}
      proProfile={proProfile}
      proEmail={resolvedProEmail}
    />,
    <StepCalendar
      selectedDate={booking.date}
      selectedTime={booking.time}
      selectedSeat={booking.seat}
      expert={booking.expert}
      proEmail={resolvedProEmail}
      price={booking.services.reduce((s, svc) => s + svc.price * (svc.persons || 1), 0)}
      duration={booking.services.reduce((s, svc) => s + (svc.duration_min || 60), 0)}
      onSelectDate={d => update("date", d)}
      onSelectTime={t => update("time", t)}
      onSelectSeat={s => update("seat", s)}
      onNext={() => setStep(3)}
      onBack={() => setStep(1)}
    />,
    <StepConfirmation
      booking={booking}
      onConfirm={() => navigate("/")}
      onBack={() => setStep(2)}
    />,
  ];

  return <div className="font-display">{steps[step]}</div>;
}